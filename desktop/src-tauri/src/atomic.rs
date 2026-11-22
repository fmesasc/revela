// Files written atomically: into a temporary file in the SAME folder (so the same file system), synced to disk, and only
// then renamed over the destination. If anything fails half way (disk full, power cut, the program killed) the destination
// is exactly as it was: before, File::create emptied it at once, and a failed «Save» of a .revela that already existed
// destroyed the previous copy. A temporary file that was never committed is removed, and nothing else is: never the destination.
//
// - Same folder: rename across file systems fails (or copies), and a copy is not atomic.
// - std::fs::rename replaces an existing file on every system: on Unix it is rename(2); on Windows, MoveFileExW with
//   MOVEFILE_REPLACE_EXISTING (documented in std::fs::rename). It fails, leaving the original, if the destination is open
//   by another program without sharing or is read-only: the error goes back to the page, and the temporary file is removed.
// - The original's permissions are kept (best effort): a new file would be 0644 or the umask's, not what the person set.
// - A destination that is a symbolic link is written through it (the file it points to), not replaced by a plain file.
//
// Only std: it is tested by itself (rustc --test src/atomic.rs) as well as with the rest.
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(0);

pub struct Atomic {
    file: Option<File>,
    tmp: PathBuf,
    dest: PathBuf,
    done: bool,
}

impl Atomic {
    // The temporary file next to `dest` (created now: it fails here if the folder isn't there or can't be written).
    pub fn create(dest: &Path) -> io::Result<Atomic> {
        // (Through a symbolic link, to the file it points to. A destination that doesn't exist yet stays as given.)
        let real = fs::canonicalize(dest).unwrap_or_else(|_| dest.to_path_buf());
        let name = real.file_name().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "no file name"))?.to_string_lossy().into_owned();
        let dir = real.parent().filter(|p| !p.as_os_str().is_empty()).map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."));
        let tmp = dir.join(format!(".{}.revela-tmp-{}-{}", name, std::process::id(), SEQ.fetch_add(1, Ordering::Relaxed)));
        let file = fs::OpenOptions::new().write(true).create_new(true).open(&tmp)?;
        Ok(Atomic { file: Some(file), tmp, dest: real, done: false })
    }

    // The temporary file, to write into.
    pub fn file(&mut self) -> &mut File {
        self.file.as_mut().expect("the file is open until commit")
    }

    // Everything written is on disk, and the temporary file takes the destination's place. → the destination.
    pub fn commit(mut self) -> io::Result<PathBuf> {
        let mut f = self.file.take().expect("the file is open until commit");
        f.flush()?;
        f.sync_all()?;
        drop(f);                                              // (closed before the rename: Windows won't rename an open file)
        if let Ok(meta) = fs::metadata(&self.dest) {
            let _ = fs::set_permissions(&self.tmp, meta.permissions());
        }
        fs::rename(&self.tmp, &self.dest)?;
        self.done = true;
        Ok(self.dest.clone())
    }
}

// Not committed (an error, an early return, a cancelled save): the temporary file goes, the destination stays.
impl Drop for Atomic {
    fn drop(&mut self) {
        if !self.done {
            self.file.take();
            let _ = fs::remove_file(&self.tmp);
        }
    }
}

// All of `bytes` at once.
pub fn write(dest: &Path, bytes: &[u8]) -> io::Result<PathBuf> {
    let mut a = Atomic::create(dest)?;
    a.file().write_all(bytes)?;
    a.commit()
}

#[cfg(test)]
mod tests {
    use super::*;

    // A folder of its own under the system's temporary one, removed at the end (std only: no tempfile crate).
    struct Dir(PathBuf);
    impl Dir {
        fn new(tag: &str) -> Dir {
            let p = std::env::temp_dir().join(format!("revela-atomic-{}-{}-{}", tag, std::process::id(), SEQ.fetch_add(1, Ordering::Relaxed)));
            fs::create_dir_all(&p).unwrap();
            Dir(p)
        }
        fn at(&self, n: &str) -> PathBuf { self.0.join(n) }
        fn names(&self) -> Vec<String> {
            let mut v: Vec<String> = fs::read_dir(&self.0).unwrap().flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect();
            v.sort();
            v
        }
    }
    impl Drop for Dir {
        fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); }
    }

    #[test]
    fn writes_a_new_file_and_leaves_no_temporary() {
        let d = Dir::new("new");
        write(&d.at("a.revela"), b"hola").unwrap();
        assert_eq!(fs::read(d.at("a.revela")).unwrap(), b"hola");
        assert_eq!(d.names(), vec!["a.revela"]);
    }

    #[test]
    fn replaces_an_existing_file() {
        let d = Dir::new("replace");
        fs::write(d.at("a.revela"), b"antes").unwrap();
        write(&d.at("a.revela"), b"despues").unwrap();
        assert_eq!(fs::read(d.at("a.revela")).unwrap(), b"despues");
        assert_eq!(d.names(), vec!["a.revela"]);
    }

    #[test]
    fn a_failed_write_leaves_the_original_untouched_and_removes_the_temporary() {
        let d = Dir::new("fail");
        fs::write(d.at("a.revela"), b"original").unwrap();
        {
            let mut a = Atomic::create(&d.at("a.revela")).unwrap();
            a.file().write_all(b"a medias").unwrap();
            assert_eq!(fs::read(d.at("a.revela")).unwrap(), b"original", "the destination is not touched while writing");
            assert_eq!(d.names().len(), 2, "the temporary file is beside it");
            // (dropped without commit: an error on the way)
        }
        assert_eq!(fs::read(d.at("a.revela")).unwrap(), b"original");
        assert_eq!(d.names(), vec!["a.revela"]);
    }

    #[test]
    fn an_error_before_the_first_byte_never_creates_or_deletes_the_destination() {
        let d = Dir::new("missing");
        // A folder that isn't there: it fails at create, and nothing exists afterwards.
        assert!(Atomic::create(&d.at("no-such-folder").join("a.revela")).is_err());
        assert!(!d.at("no-such-folder").exists());
        // Dropped without writing and without a destination: no destination appears.
        drop(Atomic::create(&d.at("b.revela")).unwrap());
        assert_eq!(d.names(), Vec::<String>::new());
    }

    #[test]
    fn a_failed_rename_keeps_the_original() {
        let d = Dir::new("rename");
        // The destination is a non-empty folder: the rename cannot replace it (on every system).
        fs::create_dir(d.at("a.revela")).unwrap();
        fs::write(d.at("a.revela").join("x"), b"x").unwrap();
        let mut a = Atomic::create(&d.at("a.revela")).unwrap();
        a.file().write_all(b"nuevo").unwrap();
        assert!(a.commit().is_err());
        assert!(d.at("a.revela").join("x").exists());
        assert_eq!(d.names(), vec!["a.revela"], "and the temporary file is gone");
    }

    #[test]
    fn many_pieces_in_order() {
        let d = Dir::new("pieces");
        let mut a = Atomic::create(&d.at("big.revela")).unwrap();
        for i in 0..50u8 { a.file().write_all(&[i; 1000]).unwrap(); }
        a.commit().unwrap();
        let got = fs::read(d.at("big.revela")).unwrap();
        assert_eq!(got.len(), 50_000);
        assert!(got.chunks(1000).enumerate().all(|(i, c)| c.iter().all(|&b| b == i as u8)));
    }

    #[cfg(unix)]
    #[test]
    fn keeps_the_permissions_of_the_original() {
        use std::os::unix::fs::PermissionsExt;
        let d = Dir::new("perm");
        fs::write(d.at("a.revela"), b"x").unwrap();
        fs::set_permissions(d.at("a.revela"), fs::Permissions::from_mode(0o600)).unwrap();
        write(&d.at("a.revela"), b"y").unwrap();
        assert_eq!(fs::metadata(d.at("a.revela")).unwrap().permissions().mode() & 0o777, 0o600);
    }

    #[cfg(unix)]
    #[test]
    fn writes_through_a_symbolic_link() {
        let d = Dir::new("link");
        fs::write(d.at("real.revela"), b"antes").unwrap();
        std::os::unix::fs::symlink(d.at("real.revela"), d.at("enlace.revela")).unwrap();
        write(&d.at("enlace.revela"), b"despues").unwrap();
        assert!(fs::symlink_metadata(d.at("enlace.revela")).unwrap().file_type().is_symlink(), "the link is still a link");
        assert_eq!(fs::read(d.at("real.revela")).unwrap(), b"despues");
    }
}

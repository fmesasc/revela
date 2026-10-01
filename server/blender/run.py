# Runs inside Blender (blender -b --factory-startup -noaudio --python-exit-code 1 -P run.py -- JOB MAX_TRIS):
# an empty scene, the model's script (user.py in JOB) under a guard, then what Revela always does
# itself: export JOB/out.glb, and a preview render JOB/preview.png (768×768, Cycles CPU, or
# Workbench if that fails) plus a small JOB/thumb.jpg. JOB/result.json says how it went.
#
# The guard (a Python audit hook: it can't be removed once set) stops the script writing outside
# JOB, opening sockets, starting processes or loading native libraries. It is a second wall: the
# container also runs this as an unprivileged user who can only write in its work folder, with no
# network (see Dockerfile and worker.js).
import bpy, sys, os, json, math, traceback

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
JOB = os.path.realpath(argv[0] if argv else os.getcwd())
MAX_TRIS = int(argv[1]) if len(argv) > 1 else 300000
SIZE = 768


def done(ok, **kw):
    with open(os.path.join(JOB, 'result.json'), 'w') as f: json.dump({'ok': ok, **kw}, f)
    sys.stdout.flush()


def inside(p):
    try: p = os.path.realpath(os.fsdecode(p))
    except Exception: return False
    return p == JOB or p.startswith(JOB + os.sep)


BLOCK = ('socket.', 'subprocess.', 'os.system', 'os.exec', 'os.posix_spawn', 'os.spawn', 'os.fork', 'os.forkpty', 'os.kill', 'os.killpg',
         'ctypes.', 'urllib.Request', 'ftplib.', 'smtplib.', 'http.client.', 'webbrowser.', 'pty.', 'os.chmod', 'os.chown', 'os.symlink', 'os.link',
         'sys.addaudithook', 'os.putenv', 'os.unsetenv')
WRITES = ('os.remove', 'os.rename', 'os.rmdir', 'os.mkdir', 'shutil.rmtree', 'shutil.copyfile', 'shutil.move', 'os.truncate', 'os.utime')


def guard(event, args):
    if event.startswith(BLOCK): raise PermissionError('not allowed in Revela: ' + event)
    if event == 'open' and args and isinstance(args[0], (str, bytes, os.PathLike)):
        mode, flags = (args[1] or 'r') if len(args) > 1 else 'r', args[2] if len(args) > 2 and isinstance(args[2], int) else 0
        if (any(c in str(mode) for c in 'wax+') or flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_APPEND)) and not inside(args[0]):
            raise PermissionError('can only write in the work folder: ' + os.fsdecode(args[0]))
    elif event in WRITES and args and isinstance(args[0], (str, bytes, os.PathLike)):
        if not all(inside(a) for a in args[:2] if isinstance(a, (str, bytes, os.PathLike))): raise PermissionError('can only change the work folder')


# ---- An empty scene in metres --------------------------------------------------------------------
for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for x in list(coll): coll.remove(x)
scene = bpy.context.scene
scene.unit_settings.system, scene.unit_settings.scale_length = 'METRIC', 1.0
bpy.context.preferences.filepaths.temporary_directory = JOB + os.sep
try: bpy.context.preferences.filepaths.use_relative_paths = True
except Exception: pass

src = open(os.path.join(JOB, 'user.py'), encoding='utf-8').read()
# (Loaded before the guard: numpy loads ctypes, which opens a native library when first imported.)
import bmesh, mathutils, random, numpy, ctypes  # noqa: F401,E401
sys.addaudithook(guard)
os.chdir(JOB)

# ---- The model's script ----------------------------------------------------------------------
try:
    exec(compile(src, 'model.py', 'exec'), {'__name__': '__main__', 'bpy': bpy, 'math': math})
except BaseException as e:                       # (SystemExit too: the script must not stop the export)
    tb = ''.join(traceback.format_exception(type(e), e, e.__traceback__.tb_next))   # (from the script's own lines)
    print(tb, file=sys.stderr)
    done(False, error='script', message=tb[-3000:]); sys.exit(1)

# ---- What Revela does itself -----------------------------------------------------------------
try:
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
except Exception: pass
for o in list(scene.objects):                    # (no cameras or lights of its own: the preview sets them)
    if o.type in ('CAMERA', 'LIGHT', 'SPEAKER', 'LIGHT_PROBE'): bpy.data.objects.remove(o)
deps = bpy.context.evaluated_depsgraph_get()
shapes = [o for o in scene.objects if o.type in ('MESH', 'CURVE', 'SURFACE', 'META', 'FONT') and o.visible_get()]
tris = 0
for o in shapes:
    e = o.evaluated_get(deps)
    try: m = e.to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); e.to_mesh_clear()
    except Exception: pass
if not shapes or not tris: done(False, error='empty', message='The script made no visible geometry.'); sys.exit(1)
if tris > MAX_TRIS: done(False, error='too many polygons', message=f'{tris} triangles (at most {MAX_TRIS}): use fewer subdivisions or segments.', tris=tris); sys.exit(1)

glb = os.path.join(JOB, 'out.glb')
try:
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_visible=True, export_apply=True, export_cameras=False, export_lights=False,
                              export_animations=True, export_yup=True)
except Exception:
    tb = traceback.format_exc(); print(tb, file=sys.stderr)
    done(False, error='export', message=tb[-3000:]); sys.exit(1)

# ---- The preview: a camera at three quarters, a sun, a soft sky and a floor ------------------
from mathutils import Vector
lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in shapes:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
centre, radius = (lo + hi) / 2, max((hi - lo).length / 2, 0.01)
cam = bpy.data.objects.new('RevelaCamera', bpy.data.cameras.new('RevelaCamera'))
scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens, cam.data.sensor_width = 50, 36
fov = 2 * math.atan(18 / 50)
view = Vector((1.0, -1.35, 0.75)).normalized()
cam.location = centre + view * (radius / math.sin(fov / 2) * 1.08)
cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.clip_start, cam.data.clip_end = radius / 100, radius * 2000
sun = bpy.data.objects.new('RevelaSun', bpy.data.lights.new('RevelaSun', 'SUN'))
sun.data.energy, sun.data.angle = 3.0, math.radians(8)
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
scene.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=radius * 400, location=(centre.x, centre.y, lo.z))
floor = bpy.context.object; floor.name = 'RevelaFloor'
fm = bpy.data.materials.new('RevelaFloor'); fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1); fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
floor.data.materials.append(fm)
world = scene.world or bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
if bg: bg.inputs[0].default_value, bg.inputs[1].default_value = (0.82, 0.85, 0.9, 1), 0.7
r = scene.render
r.resolution_x = r.resolution_y = SIZE; r.resolution_percentage = 100
r.image_settings.file_format, r.image_settings.color_mode = 'PNG', 'RGB'
r.filepath = os.path.join(JOB, 'preview.png')
try: scene.view_settings.view_transform = 'Standard'
except Exception: pass

engine = 'CYCLES'
try:
    r.engine = 'CYCLES'; scene.cycles.device = 'CPU'; scene.cycles.samples = 16; scene.cycles.use_adaptive_sampling = True; scene.cycles.adaptive_threshold = 0.05
    scene.cycles.use_denoising = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('denoising_prefilter', 'FAST'), ('denoising_quality', 'FAST')):
        try: setattr(scene.cycles, k, v)
        except Exception: pass
    scene.cycles.max_bounces, scene.cycles.caustics_reflective, scene.cycles.caustics_refractive = 4, False, False
    bpy.ops.render.render(write_still=True)
except Exception:
    traceback.print_exc(); engine = 'BLENDER_WORKBENCH'
    r.engine = 'BLENDER_WORKBENCH'; scene.display.shading.light = 'STUDIO'; scene.display.shading.color_type = 'MATERIAL'
    bpy.ops.render.render(write_still=True)

# ---- A small copy for the list of rounds ------------------------------------------------------
try:
    img = bpy.data.images.load(r.filepath); img.scale(256, 256)
    img.filepath_raw = os.path.join(JOB, 'thumb.jpg'); img.file_format = 'JPEG'; img.save()
except Exception: traceback.print_exc()
done(True, tris=tris, engine=engine, size=[round(x, 3) for x in (hi - lo)])

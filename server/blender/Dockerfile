# Revela's Blender runner (revela-blender): Debian slim + the official Blender LTS build + runner.py.
# The version and its SHA-256 are fixed (download.blender.org/release/Blender4.5/blender-4.5.14.sha256);
# to update, change both. Built and pushed by `wrangler deploy` (.github/workflows/blender.yml).
FROM debian:trixie-slim

ARG BLENDER_VERSION=4.5.14
ARG BLENDER_SHA256=9ba871ff2ecd36526b77432745980b7e6664ecd0c7ca11c48849073dcfe06da3

# Python for runner.py, and the libraries Blender's Linux build loads even in the background (-b).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils python3 \
      libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 libxkbcommon0 libsm6 libice6 libgl1 libegl1 libglib2.0-0 \
 && curl -fsSL -o /tmp/blender.tar.xz "https://download.blender.org/release/Blender${BLENDER_VERSION%.*}/blender-${BLENDER_VERSION}-linux-x64.tar.xz" \
 && echo "${BLENDER_SHA256}  /tmp/blender.tar.xz" | sha256sum -c - \
 && mkdir /opt/blender && tar -xJf /tmp/blender.tar.xz -C /opt/blender --strip-components=1 \
 && rm /tmp/blender.tar.xz && apt-get purge -y curl xz-utils && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# An unprivileged user that can write only in /work (the system's temporary folders are closed to it).
# Blender gets at most 6 GiB of address space (MEM_LIMIT_MB; the instance has 8) and 90 s (MAX_TIMEOUT).
RUN useradd --system --uid 10001 --home-dir /work --create-home --shell /usr/sbin/nologin blender \
 && chmod 0755 /tmp /var/tmp && chmod 0700 /work
COPY runner.py run.py /app/
USER blender
WORKDIR /work
ENV BLENDER=/opt/blender/blender WORK=/work PORT=8080 MAX_TIMEOUT=90 MAX_GLB_MB=15 MAX_TRIS=300000 MEM_LIMIT_MB=6144 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8080
CMD ["python3", "/app/runner.py"]

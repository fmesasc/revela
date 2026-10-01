#!/usr/bin/env python3
"""Try the Blender wrapper of «Crear modelo 3D con IA» (server/blender/run.py) with this computer's Blender.

    tools/blender-try.py [script.py] [--blender="flatpak run org.blender.Blender"] [--timeout=90]

Runs the script (by default an example: a blue ceramic coffee mug) exactly as the container does —
empty scene, the guard, export to out.glb, preview render with Cycles CPU — and leaves out.glb,
preview.png, thumb.jpg, result.json and log.txt in tmp/blender-try/ (ignored by git). With the
Flatpak Blender everything must be under /home (its /tmp is its own), as this folder is.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tmp', 'blender-try')

MUG = '''
import bpy, math

def mat(name, rgb, rough=0.35, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    return m

blue = mat("Ceramica azul", (0.05, 0.22, 0.65), 0.25)
white = mat("Interior blanco", (0.92, 0.92, 0.9), 0.3)

# Body: a cylinder with thickness (solidify) and a rounded rim (bevel), 9 cm tall, 8 cm wide.
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.04, depth=0.09, location=(0, 0, 0.045))
body = bpy.context.object; body.name = "Taza"
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT"); bpy.ops.object.mode_set(mode="OBJECT")
top = max(body.data.polygons, key=lambda p: p.center.z); top.select = True
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.delete(type="FACE"); bpy.ops.object.mode_set(mode="OBJECT")
s = body.modifiers.new("Grosor", "SOLIDIFY"); s.thickness = 0.004; s.offset = -1; s.material_offset = 1
b = body.modifiers.new("Bisel", "BEVEL"); b.width = 0.0015; b.segments = 2
body.modifiers.new("Suave", "WEIGHTED_NORMAL")
body.data.materials.append(blue); body.data.materials.append(white)
bpy.ops.object.shade_smooth()

# Handle: a torus half sunk into the side, flattened a little.
bpy.ops.mesh.primitive_torus_add(major_radius=0.022, minor_radius=0.0055, major_segments=40, minor_segments=14,
                                 location=(0.043, 0, 0.048), rotation=(math.radians(90), 0, 0))
handle = bpy.context.object; handle.name = "Asa"; handle.scale = (1, 1.25, 1)
handle.data.materials.append(blue)
bpy.ops.object.shade_smooth()
'''


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opt = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--') and '=' in a)
    os.environ.setdefault('BLENDER', opt.get('blender', 'flatpak run org.blender.Blender'))
    os.environ.setdefault('WORK', OUT)
    sys.path.insert(0, os.path.join(ROOT, 'server', 'blender'))
    import runner
    script = open(args[0], encoding='utf-8').read() if args else MUG
    os.makedirs(OUT, exist_ok=True)
    r = runner.run_job(script, int(opt.get('timeout', 90)), keep=OUT)
    open(os.path.join(OUT, 'log.txt'), 'w').write(r.get('log', ''))
    print(json.dumps({k: (f'{len(v) * 3 // 4} bytes' if k in ('glb', 'preview', 'thumb') and v else v) for k, v in r.items() if k != 'log'}, indent=1))
    print('→', OUT)
    sys.exit(0 if r['ok'] else 1)


if __name__ == '__main__':
    main()

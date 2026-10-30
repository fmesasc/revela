Lighter twins of the models in `../` (same file names), for computers that are weak or asked for the light mode
(`io/runtime/model3d.js`, `liteSrc`). Made with glTF-Transform (weld, meshopt simplify, `KHR_mesh_quantization`, WebP textures):
- static models: 40 % of the triangles (error ≤ 3 %), textures ≤ 512 px;
- rigged ones (`baetulo-legionario`, `baetulo-romano`, `barcelona-casteller`, `madrid-chulapo`): 70 % of the triangles (error ≤ 0.5 %), textures ≤ 1024 px; their 7 clips are kept.
Total 39.7 MB → 19.4 MB. A model added to `../` without its twin here still works (the page falls back to the original).
Regenerate: simplify + quantize + textureCompress with `@gltf-transform/functions` over each `../*.glb`.

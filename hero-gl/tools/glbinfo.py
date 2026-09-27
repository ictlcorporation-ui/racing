#!/usr/bin/env python3
"""Afișează structura unui GLB (meshes, materiale, texturi, bounds) fără dependențe externe."""
import sys, json, struct
p = sys.argv[1]
with open(p, "rb") as f:
    magic, ver, length = struct.unpack("<4sII", f.read(12))
    assert magic == b"glTF", "nu e GLB"
    clen, ctype = struct.unpack("<II", f.read(8))
    g = json.loads(f.read(clen))
print("size", length, "bytes | generator:", g.get("asset", {}).get("generator"))
print("meshes:", len(g.get("meshes", [])), "| materials:", len(g.get("materials", [])), "| images:", len(g.get("images", [])), "| textures:", len(g.get("textures", [])))
for m in g.get("meshes", []):
    for pr in m.get("primitives", []):
        acc = g["accessors"][pr["attributes"]["POSITION"]]
        idx = g["accessors"][pr["indices"]]["count"] if "indices" in pr else acc["count"]
        print(f" mesh '{m.get('name')}' verts={acc['count']} tris={idx // 3} min={acc.get('min')} max={acc.get('max')} attrs={list(pr['attributes'])} mat={pr.get('material')}")
for i, mat in enumerate(g.get("materials", [])):
    pbr = mat.get("pbrMetallicRoughness", {})
    print(f" mat[{i}] '{mat.get('name')}' baseTex={'baseColorTexture' in pbr} mr={pbr.get('metallicFactor')}/{pbr.get('roughnessFactor')} mrTex={'metallicRoughnessTexture' in pbr} normal={'normalTexture' in mat}")
for i, im in enumerate(g.get("images", [])):
    print(f" image[{i}] {im.get('mimeType')} {im.get('name', '')}")

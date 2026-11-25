/**
 * Geometry kit. Static scenery is built from small primitives painted with vertex colours and merged into
 * a handful of meshes per region (one draw call per material), which keeps phones fast.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

/** toon ramp shared by all toon materials */
let ramp: THREE.DataTexture | null = null;
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const steps = [90, 150, 205, 245, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  ramp = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

export const MAT = {
  toon: () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }),
  glow: () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};

export type Piece = THREE.BufferGeometry;

/** strip to position/normal/color so different primitives merge cleanly */
function prep(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, shade = 0): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) {
    // subtle per-vertex variation so flat colours don't look plastic
    const v = shade ? 1 + (Math.random() - 0.5) * shade : 1;
    col[i * 3] = _c.r * v;
    col[i * 3 + 1] = _c.g * v;
    col[i * 3 + 2] = _c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export interface Xf {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  s?: number;
}

function xform(g: THREE.BufferGeometry, t: Xf) {
  _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
  _q.setFromEuler(_e);
  const s = t.s ?? 1;
  _s.set((t.sx ?? 1) * s, (t.sy ?? 1) * s, (t.sz ?? 1) * s);
  _p.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  return g;
}

/**
 * Collects painted pieces, optionally inside a local frame (group transform), then merges them.
 */
export class Builder {
  pieces: THREE.BufferGeometry[] = [];
  glowPieces: THREE.BufferGeometry[] = [];
  private stack: THREE.Matrix4[] = [];

  /** push a local frame: subsequent pieces are placed relative to it */
  push(t: Xf) {
    _e.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0);
    _q.setFromEuler(_e);
    const s = t.s ?? 1;
    _s.set((t.sx ?? 1) * s, (t.sy ?? 1) * s, (t.sz ?? 1) * s);
    _p.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
    const m = new THREE.Matrix4().compose(_p, _q, _s);
    const parent = this.stack[this.stack.length - 1];
    this.stack.push(parent ? parent.clone().multiply(m) : m);
  }
  pop() {
    this.stack.pop();
  }

  add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, t: Xf = {}, glow = false, shade = 0.06) {
    const geo = xform(prep(g, color, glow ? 0 : shade), t);
    const top = this.stack[this.stack.length - 1];
    if (top) geo.applyMatrix4(top);
    (glow ? this.glowPieces : this.pieces).push(geo);
    return geo;
  }

  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, t: Xf = {}, glow = false) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, t, glow);
  }
  cyl(rt: number, rb: number, h: number, color: THREE.ColorRepresentation, t: Xf = {}, seg = 10, glow = false) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1), color, t, glow);
  }
  sphere(r: number, color: THREE.ColorRepresentation, t: Xf = {}, detail = 1, glow = false) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, t, glow);
  }
  cone(r: number, h: number, color: THREE.ColorRepresentation, t: Xf = {}, seg = 8) {
    return this.add(new THREE.ConeGeometry(r, h, seg, 1), color, t);
  }
  plane(w: number, h: number, color: THREE.ColorRepresentation, t: Xf = {}, glow = false) {
    const g = new THREE.PlaneGeometry(w, h);
    return this.add(g, color, t, glow);
  }

  /** merged toon geometry only (for instancing); clears the builder */
  geometry(): THREE.BufferGeometry {
    const g = mergeGeometries(this.pieces, false)!;
    g.computeBoundingSphere();
    this.pieces = [];
    this.glowPieces = [];
    return g;
  }

  /** merges into meshes (toon + glow) */
  build(name = 'static', castShadow = true): THREE.Group {
    const grp = new THREE.Group();
    grp.name = name;
    if (this.pieces.length) {
      const g = mergeGeometries(this.pieces, false)!;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, sharedToon());
      m.castShadow = castShadow;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      grp.add(m);
    }
    if (this.glowPieces.length) {
      const g = mergeGeometries(this.glowPieces, false)!;
      const m = new THREE.Mesh(g, sharedGlow());
      m.matrixAutoUpdate = false;
      m.name = 'glow';
      grp.add(m);
    }
    this.pieces = [];
    this.glowPieces = [];
    return grp;
  }
}

let _toon: THREE.MeshToonMaterial | null = null;
let _glow: THREE.MeshBasicMaterial | null = null;
export function sharedToon() {
  return (_toon ??= MAT.toon());
}
/** night factor for emissive pieces (0 day … 1 night) */
export const glowUniform = { value: 0 };
export function sharedGlow() {
  if (!_glow) {
    _glow = MAT.glow();
    _glow.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = glowUniform;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 0.92 + uGlow * 1.9;');
    };
  }
  return _glow;
}

// ───────────────────────── custom shapes ─────────────────────────

/**
 * Japanese hip-and-gable roof (irimoya-like) with upturned eaves: a box-ish frame whose ridge is shorter
 * than the base and whose eave corners lift. w/d = footprint incl. overhang, h = roof height.
 */
export function roofGeometry(w: number, d: number, h: number, lift = 0.25, ridgeRatio = 0.55): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2;
  const rw = (w * ridgeRatio) / 2;
  // vertices: 4 eave corners (lifted), 4 eave mids, 2 ridge ends
  const E = (x: number, z: number, y: number) => new THREE.Vector3(x, y, z);
  const c1 = E(-hw, -hd, lift), c2 = E(hw, -hd, lift), c3 = E(hw, hd, lift), c4 = E(-hw, hd, lift);
  const m1 = E(0, -hd, 0), m3 = E(0, hd, 0);
  const r1 = E(-rw, 0, h), r2 = E(rw, 0, h);
  const tris: THREE.Vector3[] = [];
  const T = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => tris.push(a, b, c);
  // front slope (z-): c1 m1 c2 lower edge sags slightly in the middle, up to ridge
  T(c1, r1, m1);
  T(m1, r1, r2);
  T(m1, r2, c2);
  // back slope (z+)
  T(c3, r2, m3);
  T(m3, r2, r1);
  T(m3, r1, c4);
  // hips (x- and x+)
  T(c4, r1, c1);
  T(c2, r2, c3);
  // underside
  T(c1, m1, c2);
  T(c1, c2, c3);
  T(c1, c3, c4);
  T(c3, m3, c4);
  const pos = new Float32Array(tris.length * 3);
  tris.forEach((v, i) => pos.set([v.x, v.y, v.z], i * 3));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** pagoda/temple style curved roof made of stacked flattened rings */
export function curvedRoof(w: number, d: number, h: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.quadraticCurveTo(-w * 0.3, h * 0.15, -w * 0.12, h);
  shape.lineTo(w * 0.12, h);
  shape.quadraticCurveTo(w * 0.3, h * 0.15, w / 2, 0);
  shape.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -d / 2);
  return g;
}

/** tapered leaf geometry (used by the Great Tree and foliage cards) */
export function leafGeometry(len = 1, width = 0.5): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.6, len * 0.2, width * 0.55, len * 0.7, 0, len);
  s.bezierCurveTo(-width * 0.55, len * 0.7, -width * 0.6, len * 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, 2);
  return g;
}

export function tubeAlong(points: THREE.Vector3[], r0: number, r1: number, seg = 8, radial = 6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  // taper radius along the tube
  const pos = g.attributes.position as THREE.BufferAttribute;
  const n = (seg + 1) * (radial + 1);
  const center = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    curve.getPointAt(t, center);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      if (idx >= n) continue;
      _p.fromBufferAttribute(pos, idx).sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(idx, _p.x, _p.y, _p.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

export { xform };

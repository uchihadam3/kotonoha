/** Stylized water: the sea around the island, the river ribbon and ponds (waves, fresnel, foam, sparkles). */
import * as THREE from 'three';
import { RIVER, riverSurface, heightAt } from './terrain';

const vert = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vDepthHint;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    float w = sin(wp.x * 0.08 + uTime * 0.9) * 0.12 + sin(wp.z * 0.11 - uTime * 0.7) * 0.1 + sin((wp.x + wp.z) * 0.21 + uTime * 1.7) * 0.04;
    wp.y += w;
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep, uShallow, uSky, uSun, uSunCol;
  uniform float uNight, uFoam;
  uniform sampler2D uHeight;
  uniform vec4 uHeightRect; // x0, z0, size, maxDepth
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    // procedural normal from two scrolling noise layers
    vec2 uv = vWorld.xz * 0.09;
    float n1 = noise(uv + vec2(uTime * 0.05, uTime * 0.03));
    float n2 = noise(uv * 2.3 - vec2(uTime * 0.04, -uTime * 0.06));
    vec3 N = normalize(vec3((n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.2, 1.0, (n2 - 0.5) * 0.35 - (n1 - 0.5) * 0.2));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    // depth from the terrain height texture
    vec2 huv = (vWorld.xz - uHeightRect.xy) / uHeightRect.z;
    float ground = texture2D(uHeight, clamp(huv, 0.0, 1.0)).r * 200.0 - 100.0;
    float outside = step(1.0, max(max(-huv.x, huv.x - 1.0), max(-huv.y, huv.y - 1.0)) + 1.0);
    float depth = mix(clamp((vWorld.y - ground) / uHeightRect.w, 0.0, 1.0), 1.0, outside);
    vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 0.7, depth));
    col = mix(col, uSky, fres * 0.65);
    // sun glints
    vec3 L = normalize(uSun);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 220.0) * (1.0 - uNight);
    col += uSunCol * spec * 2.5;
    // shoreline foam
    float foamLine = smoothstep(0.06, 0.0, depth) * (0.6 + 0.4 * sin(uTime * 2.0 + vWorld.x * 0.3 + vWorld.z * 0.2));
    float foamN = noise(vWorld.xz * 0.6 + uTime * 0.3);
    col = mix(col, vec3(1.0), clamp(foamLine * smoothstep(0.35, 0.75, foamN) * uFoam, 0.0, 0.85));
    float alpha = mix(0.72, 0.95, smoothstep(0.0, 0.3, depth));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export class Water {
  readonly group = new THREE.Group();
  readonly mat: THREE.ShaderMaterial;

  constructor(heightTex: THREE.DataTexture, rect: [number, number, number]) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      fog: true,
      side: THREE.DoubleSide,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uDeep: { value: new THREE.Color('#1d5f86') },
          uShallow: { value: new THREE.Color('#58c7c2') },
          uSky: { value: new THREE.Color('#bfe3f5') },
          uSun: { value: new THREE.Vector3(0, 1, 0) },
          uSunCol: { value: new THREE.Color('#ffffff') },
          uNight: { value: 0 },
          uFoam: { value: 1 },
          uHeight: { value: heightTex },
          uHeightRect: { value: new THREE.Vector4(rect[0], rect[1], rect[2], 9) },
        },
      ]),
    });
    // the sea: a big disc, denser near the island
    const sea = new THREE.Mesh(new THREE.CircleGeometry(2600, 96, 0, Math.PI * 2), this.mat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0, -80);
    sea.renderOrder = 1;
    this.group.add(sea);
    // river ribbon
    this.group.add(this.river());
  }

  private river(): THREE.Mesh {
    const pts = RIVER.map(([x, z]) => new THREE.Vector2(x, z));
    const curve = new THREE.SplineCurve(pts);
    const steps = 160;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const nx = -tan.y, nz = tan.x;
      const w = 4.5 + Math.sin(t * 20) * 0.6 + t * 3;
      const y = Math.max(riverSurface(t), -0.05);
      pos.push(p.x + nx * w, y, p.y + nz * w, p.x - nx * w, y, p.y - nz * w);
      if (i < steps) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, this.mat);
    m.renderOrder = 1;
    return m;
  }

  /** small flat pond */
  pond(x: number, z: number, rx: number, rz: number, y?: number): THREE.Mesh {
    const g = new THREE.CircleGeometry(1, 32);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.mat);
    m.scale.set(rx, 1, rz);
    m.position.set(x, y ?? heightAt(x, z) + 0.35, z);
    m.renderOrder = 1;
    this.group.add(m);
    return m;
  }

  update(t: number, sky: { horizon: THREE.Color; sunDir: THREE.Vector3; sunColor: THREE.Color; night: number }) {
    const u = this.mat.uniforms;
    u.uTime.value = t;
    u.uSky.value.copy(sky.horizon);
    u.uSun.value.copy(sky.sunDir);
    u.uSunCol.value.copy(sky.sunColor);
    u.uNight.value = sky.night;
    const night = sky.night;
    u.uDeep.value.set('#1d5f86').lerp(new THREE.Color('#0b1838'), night * 0.85);
    u.uShallow.value.set('#58c7c2').lerp(new THREE.Color('#1b3a5a'), night * 0.85);
  }
}

/** encodes the terrain grid in a texture so the water shader knows the depth */
export function heightTexture(grid: Float32Array, n: number): THREE.DataTexture {
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = Math.max(0, Math.min(255, Math.round(((grid[i] + 100) / 200) * 255)));
    data[i * 4] = v;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

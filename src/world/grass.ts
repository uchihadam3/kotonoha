/**
 * GPU grass: thousands of blades in a tile that follows the camera (wrapping in the shader), placed on the
 * terrain with the height texture and thinned by a density map (no grass on sand, roads, rock or plazas).
 * Wind sways the tips; colour varies with noise.
 */
import * as THREE from 'three';
import { WORLD, heightAt, roadInfo, riverDist, normalAt } from './terrain';
import { REGIONS } from '../data/regions';

export function densityTexture(): THREE.DataTexture {
  const N = 256;
  const data = new Uint8Array(N * N * 4);
  const x0 = WORLD.cx - WORLD.size / 2, z0 = WORLD.cz - WORLD.size / 2;
  const n = new THREE.Vector3();
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = x0 + ((i + 0.5) / N) * WORLD.size, z = z0 + ((j + 0.5) / N) * WORLD.size;
      const y = heightAt(x, z);
      let d = y < 2.4 ? 0 : y > 70 ? 0.25 : 1;
      if (d > 0) {
        normalAt(x, z, n);
        if (n.y < 0.82) d = 0;
        const rd = roadInfo(x, z).d;
        if (rd < 4.5) d *= Math.max(0, (rd - 2.5) / 2);
        if (riverDist(x, z).d < 7) d = 0;
        for (const r of REGIONS) {
          const dd = Math.hypot(x - r.x, z - r.z);
          if (dd < r.r * 0.75 && r.id !== 'vila' && r.id !== 'escola' && r.id !== 'templo') d *= Math.min(1, Math.max(0, (dd - r.r * 0.45) / (r.r * 0.3)));
          if (r.id === 'neon' && dd < r.r) d = 0;
        }
      }
      const k = (j * N + i) * 4;
      data[k] = Math.round(d * 255);
      data[k + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export class Grass {
  readonly mesh: THREE.InstancedMesh;
  private mat: THREE.ShaderMaterial;
  constructor(heightTex: THREE.Texture, count: number, tile = 64) {
    // a blade: 5 vertices (two segments + tip)
    const g = new THREE.BufferGeometry();
    const w = 0.055, hgt = 0.5;
    const pos = new Float32Array([-w, 0, 0, w, 0, 0, -w * 0.7, hgt * 0.5, 0, w * 0.7, hgt * 0.5, 0, 0, hgt, 0]);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    g.computeVertexNormals();
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    const half = WORLD.size / 2;
    this.mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        THREE.UniformsLib.lights,
        {
          uTime: { value: 0 },
          uCenter: { value: new THREE.Vector2() },
          uTile: { value: tile },
          uHeight: { value: heightTex },
          uDensity: { value: densityTexture() },
          uRect: { value: new THREE.Vector3(WORLD.cx - half, WORLD.cz - half, WORLD.size) },
          uSun: { value: new THREE.Color(1, 1, 1) },
          uAmb: { value: new THREE.Color(0.6, 0.65, 0.7) },
          uSat: { value: 1 },
        },
      ]),
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime, uTile;
        uniform vec2 uCenter;
        uniform sampler2D uHeight, uDensity;
        uniform vec3 uRect;
        varying float vH;
        varying float vShade;
        varying vec3 vTint;
        #include <fog_pars_vertex>
        void main() {
          // wrap the blade's tile position around the camera
          vec2 local = aSeed.xy * uTile;
          vec2 base = uCenter - vec2(uTile * 0.5);
          vec2 wp = base + mod(local - base, uTile);
          vec2 uv = (wp - uRect.xy) / uRect.z;
          float ground = texture2D(uHeight, uv).r * 200.0 - 100.0;
          float dens = texture2D(uDensity, uv).r;
          float keep = step(aSeed.z, dens);
          // fade near the tile edge so wrapping is invisible
          vec2 dc = abs(wp - uCenter) / (uTile * 0.5);
          float edge = 1.0 - smoothstep(0.75, 1.0, max(dc.x, dc.y));
          float s = keep * edge * (0.6 + aSeed.w * 0.9);
          float ang = aSeed.z * 6.2831;
          vec3 p = position * vec3(1.0, s, 1.0);
          float c = cos(ang), sn = sin(ang);
          p = vec3(p.x * c - p.z * sn, p.y, p.x * sn + p.z * c);
          float h = position.y / 0.5;
          float wind = sin(uTime * 1.8 + wp.x * 0.35 + wp.y * 0.21) * 0.18 + sin(uTime * 3.1 + wp.x * 0.9) * 0.05;
          p.x += wind * h * h;
          p.z += wind * 0.6 * h * h;
          vec3 world = vec3(wp.x, ground - 0.05, wp.y) + p;
          vH = h;
          vShade = 0.75 + aSeed.w * 0.35;
          vTint = mix(vec3(0.07, 0.2, 0.04), vec3(0.2, 0.36, 0.06), aSeed.x * 0.5 + aSeed.y * 0.5);
          vec4 mv = viewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mv;
          vec4 mvPosition = mv;
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun, uAmb;
        uniform float uSat;
        varying float vH;
        varying float vShade;
        varying vec3 vTint;
        #include <fog_pars_fragment>
        void main() {
          vec3 base = vTint * mix(0.55, 1.35, vH) * vShade;
          vec3 col = base * (uAmb + uSun * 0.55);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    this.mesh = new THREE.InstancedMesh(g, this.mat, count);
    this.mesh.frustumCulled = false;
    const id = new THREE.Matrix4();
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, id);
    this.mesh.receiveShadow = false;
    this.mesh.name = 'grass';
  }

  update(t: number, center: THREE.Vector3, sun: THREE.Color, sunI: number, hemi: THREE.Color, hemiI: number) {
    const u = this.mat.uniforms;
    u.uTime.value = t;
    u.uCenter.value.set(center.x, center.z);
    u.uSun.value.copy(sun).multiplyScalar(sunI * 0.35);
    u.uAmb.value.copy(hemi).multiplyScalar(hemiI * 0.75);
  }
}

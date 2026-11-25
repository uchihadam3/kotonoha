/**
 * GPU particles: falling sakura petals / glowing leaves (instanced, animated entirely in the shader),
 * fireflies, sparkle bursts and floating kanji glyphs for learning moments.
 */
import * as THREE from 'three';
import { glowTex, petalTex, glyphTex } from './textures';
import { leafGeometry } from './kit';

export class Falling {
  readonly mesh: THREE.InstancedMesh;
  private mat: THREE.ShaderMaterial;
  constructor(opts: { count: number; radius: number; height: number; kind: 'petal' | 'leaf' | 'snow'; color?: string; glow?: number; speed?: number; size?: number }) {
    const geo = opts.kind === 'leaf' ? leafGeometry(0.5, 0.26) : new THREE.PlaneGeometry(opts.size ?? 0.22, opts.size ?? 0.22);
    const n = opts.count;
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: opts.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uR: { value: opts.radius },
        uH: { value: opts.height },
        uSpeed: { value: opts.speed ?? 1 },
        uColor: { value: new THREE.Color(opts.color ?? '#ffffff') },
        uGlow: { value: opts.glow ?? 0 },
        uMap: { value: opts.kind === 'petal' ? petalTex() : glowTex() },
        uUseMap: { value: opts.kind === 'leaf' ? 0 : 1 },
        uOpacity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime, uR, uH, uSpeed;
        uniform vec3 uCenter;
        varying vec2 vUv;
        varying float vFade;
        mat3 rotXYZ(vec3 a) {
          float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
          return mat3(cy*cz, cy*sz, -sy, sx*sy*cz - cx*sz, sx*sy*sz + cx*cz, sx*cy, cx*sy*cz + sx*sz, cx*sy*sz - sx*cz, cx*cy);
        }
        void main() {
          vUv = uv;
          float life = fract(aSeed.w + uTime * 0.035 * uSpeed * (0.6 + aSeed.z * 0.8));
          float ang = aSeed.x * 6.2831;
          float rad = sqrt(aSeed.y) * uR;
          vec3 base = uCenter + vec3(cos(ang) * rad, uH * (1.0 - life), sin(ang) * rad);
          base.x += sin(uTime * 0.7 + aSeed.z * 20.0) * 1.6 + life * 4.0;
          base.z += cos(uTime * 0.5 + aSeed.x * 20.0) * 1.2;
          mat3 R = rotXYZ(vec3(uTime * (0.8 + aSeed.x), uTime * (0.6 + aSeed.y), aSeed.z * 6.0));
          vec3 p = R * position + base;
          vFade = smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.85, life);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uGlow, uUseMap, uOpacity;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vec4 t = uUseMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
          vec3 c = (uUseMap > 0.5 && uGlow < 0.5) ? t.rgb : uColor * (1.0 + uGlow * 1.5);
          float a = t.a * vFade * uOpacity;
          if (a < 0.02) discard;
          gl_FragColor = vec4(c, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, n);
    this.mesh.frustumCulled = false;
    const id = new THREE.Matrix4();
    for (let i = 0; i < n; i++) this.mesh.setMatrixAt(i, id);
  }
  set center(v: THREE.Vector3) {
    this.mat.uniforms.uCenter.value.copy(v);
  }
  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v;
  }
  update(t: number) {
    this.mat.uniforms.uTime.value = t;
  }
}

/** fireflies: drifting glowing points (night) */
export class Fireflies {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  constructor(count: number, radius: number, color = '#d6ff8a') {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
      pos.set([Math.cos(a) * r, 0.4 + Math.random() * 2.5, Math.sin(a) * r], i * 3);
      seed[i] = Math.random() * 100;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uMap: { value: glowTex() }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uPx;
        varying float vBlink;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.5 + aSeed) * 1.2;
          p.y += sin(uTime * 0.8 + aSeed * 2.0) * 0.5;
          p.z += cos(uTime * 0.4 + aSeed * 1.3) * 1.2;
          vBlink = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 7.0), 3.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 90.0 * uPx / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vBlink;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(uColor * 2.2, t.a * vBlink * uOpacity);
        }
      `,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
  }
  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v;
    this.points.visible = v > 0.01;
  }
  update(t: number, pixelRatio = 1) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uPx.value = pixelRatio;
  }
}

/** short-lived sparkle burst + rising glyph (word learned, correct answer…) */
export class Bursts {
  readonly group = new THREE.Group();
  private items: { obj: THREE.Object3D; t: number; life: number; vel: THREE.Vector3; kind: 'spark' | 'glyph' | 'ring'; mat: THREE.Material & { opacity: number } }[] = [];

  spark(pos: THREE.Vector3, color = '#bfffe0', n = 24, speed = 4) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const s = new THREE.Sprite(mat);
      s.position.copy(pos);
      const sc = 0.25 + Math.random() * 0.35;
      s.scale.set(sc, sc, 1);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      this.group.add(s);
      this.items.push({ obj: s, t: 0, life: 0.9 + Math.random() * 0.6, vel: v, kind: 'spark', mat });
    }
  }

  glyph(pos: THREE.Vector3, ch: string, color = '#fff6d6', glow = 'rgba(95,211,162,.9)', size = 1.4) {
    const mat = new THREE.SpriteMaterial({ map: glyphTex(ch, color, glow), transparent: true, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.set(size, size, 1);
    this.group.add(s);
    this.items.push({ obj: s, t: 0, life: 2.2, vel: new THREE.Vector3(0, 1.1, 0), kind: 'glyph', mat });
  }

  ring(pos: THREE.Vector3, color = '#bfffe0', size = 6) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    m.userData.size = size;
    this.group.add(m);
    this.items.push({ obj: m, t: 0, life: 1.1, vel: new THREE.Vector3(), kind: 'ring', mat });
  }

  /** a glowing leaf of light flying from a point to the Great Tree */
  comet(from: THREE.Vector3, to: THREE.Vector3, color = '#9fffd2') {
    const mat = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
    const head = new THREE.Sprite(mat);
    head.scale.set(1.6, 1.6, 1);
    head.position.copy(from);
    const mid = from.clone().lerp(to, 0.35).add(new THREE.Vector3(0, 60 + from.distanceTo(to) * 0.15, 0));
    const curve = new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
    this.group.add(head);
    const life = 3.2;
    let t = 0;
    let trailT = 0;
    const item = { obj: head as THREE.Object3D, t: 0, life, vel: new THREE.Vector3(), kind: 'comet' as const, mat, curve, step: (dt: number) => {
      t += dt;
      const k = Math.min(1, t / life);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      head.position.copy(curve.getPoint(e));
      head.scale.setScalar(1.6 + Math.sin(t * 20) * 0.2 + k * 6);
      trailT -= dt;
      if (trailT <= 0 && k < 0.95) {
        trailT = 0.03;
        const tm = new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, opacity: 0.7 });
        const sp = new THREE.Sprite(tm);
        sp.position.copy(head.position);
        sp.scale.setScalar(0.9 + k * 4);
        this.group.add(sp);
        this.items.push({ obj: sp, t: 0, life: 0.9, vel: new THREE.Vector3(0, 0.4, 0), kind: 'spark', mat: tm });
      }
    } };
    this.comets.push(item);
  }
  private comets: { obj: THREE.Object3D; t: number; life: number; mat: THREE.Material & { opacity: number }; step: (dt: number) => void }[] = [];

  update(dt: number) {
    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.t += dt;
      c.step(dt);
      if (c.t >= c.life) {
        this.group.remove(c.obj);
        c.mat.dispose();
        this.comets.splice(i, 1);
      }
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        this.group.remove(it.obj);
        it.mat.dispose();
        this.items.splice(i, 1);
        continue;
      }
      if (it.kind === 'spark') {
        it.vel.y -= 3.5 * dt;
        it.obj.position.addScaledVector(it.vel, dt);
        it.mat.opacity = 1 - k;
      } else if (it.kind === 'glyph') {
        it.obj.position.addScaledVector(it.vel, dt);
        it.mat.opacity = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
        const s = (it.obj as THREE.Sprite).scale.x;
        (it.obj as THREE.Sprite).scale.setScalar(s * (1 + dt * 0.15));
      } else {
        const s = (it.obj.userData.size as number) * (0.2 + k);
        it.obj.scale.set(s, s, s);
        it.mat.opacity = 1 - k;
      }
    }
  }
}

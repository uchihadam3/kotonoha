/**
 * 言の葉の大樹 — the Great Tree of Words. A huge procedural tree whose 10 000 leaf slots light up as the
 * player learns words: jade (learned), sakura (memorised), gold (mastered), amber (wilting: due review).
 * It is the game's progress meter, visible from the whole island.
 */
import * as THREE from 'three';
import { Builder, tubeAlong, leafGeometry, toonRamp } from './kit';
import { Rng } from '../core/rng';
import { glowTex } from './textures';

export const LEAF_SLOTS = 10000;

interface Branch {
  pts: THREE.Vector3[];
  r0: number;
  r1: number;
  depth: number;
}

export class GreatTree {
  readonly group = new THREE.Group();
  private leaves: THREE.InstancedMesh;
  private leafMat: THREE.ShaderMaterial;
  private slotPos: THREE.Vector3[] = [];
  private order: number[] = [];
  private stateAttr: THREE.InstancedBufferAttribute;
  private motes: THREE.Points;
  private veinMat: THREE.MeshBasicMaterial;
  shown = { learned: 0, memorized: 0, mastered: 0, wilting: 0 };
  private current = new Float32Array(LEAF_SLOTS);
  private barkMat!: THREE.MeshToonMaterial;
  light!: THREE.PointLight;

  constructor(readonly scale = 1, detail: 'high' | 'low' = 'high') {
    const r = new Rng(77);
    const branches: Branch[] = [];
    const grow = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
      const pts: THREE.Vector3[] = [start.clone()];
      const p = start.clone();
      const d = dir.clone().normalize();
      const segs = 5;
      for (let i = 1; i <= segs; i++) {
        // gentle twist and upward bias
        d.x += r.range(-0.18, 0.18);
        d.z += r.range(-0.18, 0.18);
        d.y += depth === 0 ? 0.05 : 0.12;
        d.normalize();
        p.addScaledVector(d, len / segs);
        pts.push(p.clone());
      }
      branches.push({ pts, r0: rad, r1: rad * 0.62, depth });
      if (depth < 3) {
        const n = depth === 0 ? 5 : depth === 1 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + r.range(-0.5, 0.5) + depth;
          const out = new THREE.Vector3(Math.cos(a), depth === 0 ? r.range(0.35, 0.75) : r.range(0.15, 0.6), Math.sin(a)).normalize();
          const from = depth === 0 ? pts[Math.min(pts.length - 1, 3 + (k % 2))] : pts[pts.length - 1];
          grow(from, out.lerp(d, 0.25), len * (depth === 0 ? 0.62 : 0.66), rad * 0.62 * 0.8, depth + 1);
        }
      }
    };
    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 34, 5.2, 0);

    // bark mesh
    const b = new Builder();
    for (const br of branches) b.add(tubeAlong(br.pts, br.r0, br.r1, detail === 'high' ? 10 : 6, detail === 'high' ? 8 : 6), br.depth === 0 ? '#5a4232' : '#6a4e3a', {}, false, 0.08);
    // flared roots
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + r.range(-0.2, 0.2);
      const pts = [new THREE.Vector3(0, 3.5, 0), new THREE.Vector3(Math.cos(a) * 4, 1.2, Math.sin(a) * 4), new THREE.Vector3(Math.cos(a) * 9, -0.3, Math.sin(a) * 9), new THREE.Vector3(Math.cos(a) * 13, -1.2, Math.sin(a) * 13)];
      b.add(tubeAlong(pts, 2.4, 0.4, 8, 6), '#563f30', {}, false, 0.08);
    }
    const bark = b.build('bark', true);
    this.group.add(bark);

    // glowing veins along the main branches (pulse with progress)
    this.veinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff0c4'), transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false });
    for (const br of branches.filter((x) => x.depth <= 1)) {
      const vein = new THREE.Mesh(tubeAlong(br.pts.map((p) => p.clone().add(new THREE.Vector3(0.2, 0, 0.2))), br.r0 * 0.18, br.r1 * 0.12, 10, 4), this.veinMat);
      this.group.add(vein);
    }

    // leaf slots: clusters around branch tips, deterministic
    const tips = branches.filter((x) => x.depth >= 2).map((x) => x.pts[x.pts.length - 1]);
    const mids = branches.filter((x) => x.depth >= 1).map((x) => x.pts[Math.floor(x.pts.length / 2)]);
    for (let i = 0; i < LEAF_SLOTS; i++) {
      const useTip = r.chance(0.82);
      const c = useTip ? tips[i % tips.length] : mids[i % mids.length];
      const rad = useTip ? 8.5 : 6;
      // point in a flattened sphere, denser toward the outside
      const u = r.next(), v = r.next();
      const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
      const rr = rad * Math.cbrt(0.25 + r.next() * 0.75);
      this.slotPos.push(new THREE.Vector3(c.x + rr * Math.sin(ph) * Math.cos(th), c.y + rr * Math.cos(ph) * 0.65 + 1.5, c.z + rr * Math.sin(ph) * Math.sin(th)));
    }
    // fill order: random permutation so leaves appear all over the canopy
    this.order = Array.from({ length: LEAF_SLOTS }, (_, i) => i);
    for (let i = LEAF_SLOTS - 1; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }

    const lg = leafGeometry(2.3, 1.15);
    lg.translate(0, -0.2, 0);
    this.leafMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: false,
      fog: false,
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uHaze: { value: new THREE.Color('#cfe3f2') }, uHazeK: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aState;
        uniform float uTime;
        varying float vState;
        varying float vShade;
        varying float vDist;
        void main() {
          vState = aState;
          float s = aState < 0.5 ? 0.0 : (aState < 1.5 ? 0.0 : 1.0);
          vec3 p = position * s;
          vec4 ip = instanceMatrix * vec4(p, 1.0);
          vec3 wp0 = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
          float sw = sin(uTime * 1.6 + wp0.x * 0.3 + wp0.z * 0.2) * 0.25;
          ip.x += sw * position.y;
          ip.z += cos(uTime * 1.3 + wp0.y * 0.4) * 0.18 * position.y;
          vShade = 0.75 + 0.25 * position.y;
          vec4 mv = modelViewMatrix * ip;
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uNight, uTime, uHazeK;
        uniform vec3 uHaze;
        varying float vState;
        varying float vShade;
        varying float vDist;
        void main() {
          vec3 c;
          if (vState < 2.5) c = vec3(0.62, 0.38, 0.12);        // wilting (due)
          else if (vState < 3.5) c = vec3(0.04, 0.6, 0.34);    // learned
          else if (vState < 4.5) c = vec3(0.95, 0.42, 0.66);   // memorised
          else c = vec3(1.0, 0.74, 0.16);                      // mastered
          float glow = mix(0.9, 1.18, uNight);
          c *= vShade * glow;
          float haze = clamp((vDist - 120.0) / 900.0, 0.0, 0.75) * uHazeK;
          c = mix(c, uHaze, haze);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    this.leaves = new THREE.InstancedMesh(lg, this.leafMat, LEAF_SLOTS);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3();
    for (let i = 0; i < LEAF_SLOTS; i++) {
      e.set(r.range(-0.8, 0.8), r.range(0, Math.PI * 2), r.range(-0.8, 0.8));
      q.setFromEuler(e);
      s3.setScalar(r.range(0.8, 1.25));
      m4.compose(this.slotPos[i], q, s3);
      this.leaves.setMatrixAt(i, m4);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    this.stateAttr = new THREE.InstancedBufferAttribute(new Float32Array(LEAF_SLOTS), 1);
    this.stateAttr.setUsage(THREE.DynamicDrawUsage);
    lg.setAttribute('aState', this.stateAttr);
    this.leaves.frustumCulled = false;
    this.group.add(this.leaves);

    // floating light motes around the canopy
    const mg = new THREE.BufferGeometry();
    const mp = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      const p = this.slotPos[Math.floor(r.next() * LEAF_SLOTS)];
      mp.set([p.x + r.range(-6, 6), p.y + r.range(-8, 6), p.z + r.range(-6, 6)], i * 3);
    }
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: glowTex(), color: '#bfffe0', size: 1.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    this.group.add(this.motes);
    this.group.scale.setScalar(scale);
    // bark should not fade into the fog at distance either
    this.barkMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), fog: false, emissive: new THREE.Color('#2a5a48'), emissiveIntensity: 0.2 });
    bark.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = this.barkMat;
    });
    // the canopy lights its surroundings at night
    this.light = new THREE.PointLight('#7ff0c4', 0, 160, 1.6);
    this.light.position.set(0, 48, 0);
    this.group.add(this.light);
  }

  /** set how many leaves of each kind are shown (animated toward these targets) */
  setCounts(learned: number, memorized: number, mastered: number, wilting: number) {
    this.shown = { learned: Math.min(LEAF_SLOTS, learned), memorized, mastered, wilting };
  }

  /** instantly show a number of leaves (title screen / cutscenes) */
  setAll(state: number, count = LEAF_SLOTS) {
    for (let i = 0; i < LEAF_SLOTS; i++) this.current[this.order[i]] = i < count ? state : 0;
    this.stateAttr.array.set(this.current);
    this.stateAttr.needsUpdate = true;
  }

  private target(slotRank: number): number {
    const { learned, memorized, mastered, wilting } = this.shown;
    if (slotRank >= learned) return 0;
    if (slotRank < mastered) return 5;
    if (slotRank < mastered + memorized) return 4;
    if (slotRank >= learned - wilting) return 2;
    return 3;
  }

  /** apply the current counts to every leaf right away (no growing animation) */
  instant() {
    const arr = this.stateAttr.array as Float32Array;
    for (let k = 0; k < LEAF_SLOTS; k++) arr[this.order[k]] = this.target(k);
    this.stateAttr.needsUpdate = true;
  }

  /** world position of the slot that the next learned leaf will take (for the flying-leaf effect) */
  nextLeafPos(out = new THREE.Vector3()): THREE.Vector3 {
    const i = this.order[Math.min(LEAF_SLOTS - 1, this.shown.learned)];
    return out.copy(this.slotPos[i]).applyMatrix4(this.group.matrixWorld);
  }

  update(t: number, night: number, haze: THREE.Color, hazeK = 1) {
    this.leafMat.uniforms.uTime.value = t;
    this.leafMat.uniforms.uNight.value = night;
    this.leafMat.uniforms.uHaze.value.copy(haze);
    this.leafMat.uniforms.uHazeK.value = hazeK;
    // grow a few leaves per frame toward the target (visible "filling" animation)
    let changed = 0;
    const arr = this.stateAttr.array as Float32Array;
    for (let k = 0; k < LEAF_SLOTS && changed < 60; k++) {
      const slot = this.order[k];
      const tgt = this.target(k);
      if (arr[slot] !== tgt) {
        arr[slot] = tgt;
        changed++;
      }
    }
    if (changed) this.stateAttr.needsUpdate = true;
    const prog = this.shown.learned / LEAF_SLOTS;
    this.veinMat.opacity = 0.15 + prog * 0.6 + Math.sin(t * 1.5) * 0.08;
    this.light.intensity = (0.3 + prog * 1.2) * (0.25 + night * 0.75) * 420;
    this.barkMat.emissiveIntensity = 0.06 + night * (0.1 + prog * 0.25);
    (this.motes.material as THREE.PointsMaterial).opacity = 0.35 + 0.4 * night + prog * 0.3;
    this.motes.rotation.y = t * 0.02;
  }
}

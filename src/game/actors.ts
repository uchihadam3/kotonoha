/** NPC actors, word spots with floating labels, region gates (mist of Silence) and shadows. */
import * as THREE from 'three';
import { Character } from '../world/characters';
import type { NpcSpawn, WordSpot } from '../world/regionkit';
import { heightAt } from '../world/terrain';
import type { Word } from '../lang/vocab';
import { damp, angleDiff, h } from '../core/util';
import type { RegionDef } from '../data/regions';
import { glowTex } from '../world/textures';
import type { Collision, Collider } from '../world/terrain';

export class NpcActor {
  readonly char: Character;
  readonly home: THREE.Vector3;
  pos = new THREE.Vector3();
  yaw: number;
  private wanderT = Math.random() * 4;
  private target: THREE.Vector3 | null = null;
  busy = false;
  label: HTMLElement;

  constructor(readonly def: NpcSpawn, scene: THREE.Scene, labels: HTMLElement) {
    this.char = new Character(def.look);
    this.home = new THREE.Vector3(def.x, heightAt(def.x, def.z), def.z);
    this.pos.copy(this.home);
    this.yaw = def.ry ?? 0;
    scene.add(this.char.root);
    this.sync();
    const icon = def.role === 'game' ? '🎮' : def.role === 'talk' ? '💬' : def.role === 'quest' ? '❗' : def.role === 'guide' ? '✨' : '📖';
    this.label = h(`<div class="marker-label npc"><div class="ico">${icon}</div><div class="ml">${def.name}</div><div class="mr">${def.jp}</div></div>`);
    labels.appendChild(this.label);
  }

  sync() {
    this.char.root.position.copy(this.pos);
    this.char.root.rotation.y = this.yaw;
  }

  update(dt: number, player: THREE.Vector3, col: Collision) {
    const d = this.pos.distanceTo(player);
    if (this.busy || d < 4.5) {
      // face the player
      const want = Math.atan2(player.x - this.pos.x, player.z - this.pos.z);
      this.yaw += angleDiff(this.yaw, want) * Math.min(1, dt * 5);
      this.char.speed = damp(this.char.speed, 0, 8, dt);
      this.target = null;
    } else if (this.def.wander) {
      this.wanderT -= dt;
      if (!this.target && this.wanderT <= 0) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.def.wander;
        this.target = new THREE.Vector3(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
        this.wanderT = 3 + Math.random() * 5;
      }
      if (this.target) {
        const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.3) {
          this.target = null;
          this.char.speed = 0;
        } else {
          const want = Math.atan2(dx, dz);
          this.yaw += angleDiff(this.yaw, want) * Math.min(1, dt * 6);
          const sp = 1.3;
          let nx = this.pos.x + Math.sin(this.yaw) * sp * dt, nz = this.pos.z + Math.cos(this.yaw) * sp * dt;
          [nx, nz] = col.resolve(nx, nz, 0.35);
          this.pos.x = nx;
          this.pos.z = nz;
          this.char.speed = sp;
        }
      }
    } else {
      const want = this.def.ry ?? 0;
      this.yaw += angleDiff(this.yaw, want) * Math.min(1, dt * 2);
      this.char.speed = damp(this.char.speed, 0, 8, dt);
    }
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.char.update(dt);
    this.sync();
  }
}

export class WordSpotActor {
  readonly pos: THREE.Vector3;
  label: HTMLElement;
  constructor(readonly spot: WordSpot, readonly word: Word, labels: HTMLElement) {
    const y = spot.y ?? heightAt(spot.x, spot.z);
    this.pos = new THREE.Vector3(spot.x, y + (spot.h ?? 2.2), spot.z);
    this.label = h(`<div class="marker-label"><div class="ml">${word.w.replace(/^～/, '〜')}</div><div class="mr"></div></div>`);
    labels.appendChild(this.label);
  }
  setKnown(known: boolean, seen: boolean, reading: string, pt: string) {
    const ml = this.label.querySelector('.ml') as HTMLElement;
    ml.classList.toggle('known', known);
    (this.label.querySelector('.mr') as HTMLElement).textContent = seen ? `${reading} · ${pt}` : '？ examinar';
  }
}

/** a swirling wall of grey mist around a locked place */
export class Gate {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  colliders: Collider[] = [];
  open = false;
  private fade = 1;
  constructor(readonly region: RegionDef, scene: THREE.Scene, col: Collision) {
    const R = region.r + 10;
    const geo = new THREE.CylinderGeometry(R, R, 26, 96, 1, true);
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uFade; varying vec2 vUv; varying vec3 vW;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 p = vec2(vUv.x * 60.0, vUv.y * 6.0);
          float n = noise(p + vec2(uTime*0.4, -uTime*0.6)) * 0.6 + noise(p*2.1 - vec2(uTime*0.3, uTime*0.2)) * 0.4;
          float a = smoothstep(0.25, 0.75, n) * (1.0 - vUv.y) * 0.85 * smoothstep(0.0, 0.08, vUv.y);
          vec3 c = mix(vec3(0.18,0.18,0.24), vec3(0.42,0.4,0.5), n);
          gl_FragColor = vec4(c, a * uFade);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    const gy = heightAt(region.x + region.r, region.z);
    this.mesh.position.set(region.x, gy + 11, region.z);
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
    // ring of colliders
    const n = Math.ceil((2 * Math.PI * R) / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.colliders.push(col.circle(region.x + Math.cos(a) * R, region.z + Math.sin(a) * R, 2.2, 'gate:' + region.id));
    }
  }
  /** distance from a point to the wall (negative inside) */
  distance(x: number, z: number) {
    return Math.hypot(x - this.region.x, z - this.region.z) - (this.region.r + 10);
  }
  unlock() {
    this.open = true;
    for (const c of this.colliders) c.off = true;
  }
  update(dt: number, t: number) {
    this.mat.uniforms.uTime.value = t;
    if (this.open) {
      this.fade = Math.max(0, this.fade - dt * 0.4);
      this.mat.uniforms.uFade.value = this.fade;
      this.mesh.visible = this.fade > 0.01;
      this.mesh.scale.y = 0.4 + this.fade * 0.6;
    }
  }
}

/** a shadow of the Silence wandering near the player (touch it to battle) */
export class Shadow {
  readonly group = new THREE.Group();
  private t = Math.random() * 10;
  boss: boolean;
  dead = false;
  region = '';
  constructor(scene: THREE.Scene, pos: THREE.Vector3, boss = false) {
    this.boss = boss;
    const s = boss ? 2.4 : 1;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 * s, 20, 16),
      new THREE.MeshBasicMaterial({ color: '#16141f', transparent: true, opacity: 0.92 }),
    );
    body.scale.y = 1.3;
    this.group.add(body);
    for (let i = 0; i < 6; i++) {
      const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 1.1 * s, 6), new THREE.MeshBasicMaterial({ color: '#221f30', transparent: true, opacity: 0.8 }));
      const a = (i / 6) * Math.PI * 2;
      wisp.position.set(Math.cos(a) * 0.45 * s, -0.8 * s, Math.sin(a) * 0.45 * s);
      wisp.rotation.x = Math.PI;
      wisp.userData.a = a;
      this.group.add(wisp);
    }
    // eyes and the X over the mouth (silence)
    for (const sd of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff5a7a', toneMapped: false }));
      eye.position.set(sd * 0.22 * s, 0.25 * s, 0.62 * s);
      this.group.add(eye);
    }
    const x1 = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.07 * s, 0.05), new THREE.MeshBasicMaterial({ color: '#9a96aa' }));
    x1.position.set(0, -0.12 * s, 0.66 * s);
    x1.rotation.z = 0.7;
    const x2 = x1.clone();
    x2.rotation.z = -0.7;
    this.group.add(x1, x2);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#6a4aa8', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.scale.set(3.2 * s, 3.2 * s, 1);
    this.group.add(aura);
    this.group.position.copy(pos);
    scene.add(this.group);
  }
  update(dt: number, player: THREE.Vector3) {
    this.t += dt;
    const g = this.group;
    g.position.y = heightAt(g.position.x, g.position.z) + 1.4 * (this.boss ? 1.8 : 1) + Math.sin(this.t * 2) * 0.25;
    g.lookAt(player.x, g.position.y, player.z);
    g.children.forEach((c) => {
      if (c.userData.a !== undefined) c.position.y = -0.8 - Math.sin(this.t * 4 + (c.userData.a as number)) * 0.15;
    });
    // drift toward the player slowly when close
    const d = Math.hypot(player.x - g.position.x, player.z - g.position.z);
    if (d < 14 && d > 2 && !this.boss) {
      g.position.x += ((player.x - g.position.x) / d) * dt * 0.8;
      g.position.z += ((player.z - g.position.z) / d) * dt * 0.8;
    }
  }
  remove() {
    this.dead = true;
    this.group.removeFromParent();
  }
}

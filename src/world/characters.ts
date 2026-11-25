/**
 * Chibi characters built from primitives with anime faces (expression atlas), procedural animation
 * (idle breathing, walk/run cycle, bow お辞儀, wave, talk, jump) and many outfits. Plus Kon, the fox spirit.
 */
import * as THREE from 'three';
import { Builder, sharedToon, leafGeometry } from './kit';
import { faceAtlas, exprUV, glowTex, type Expr } from './textures';
import { damp, lerp } from '../core/util';

export type HairStyle = 'short' | 'long' | 'pony' | 'bun' | 'twin' | 'spiky' | 'bob' | 'bald' | 'topknot' | 'messy';
export type Outfit = 'traveler' | 'kimono' | 'yukata' | 'schoolM' | 'schoolF' | 'apron' | 'miko' | 'monk' | 'suit' | 'samurai' | 'casual' | 'otaku' | 'gyaru' | 'fisher' | 'elder' | 'kid' | 'chef' | 'ninja' | 'idol' | 'doctor' | 'priest';
export type Hat = 'none' | 'straw' | 'headband' | 'cap' | 'kerchief' | 'eboshi' | 'chef' | 'bow' | 'cat';

export interface Look3D {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: Outfit;
  top: string;
  bottom: string;
  accent: string;
  eyes: string;
  glasses?: boolean;
  hat?: Hat;
  scale?: number;
  old?: boolean;
  lashes?: boolean;
  backpack?: boolean;
  ghost?: boolean;
}

export const SKINS = ['#ffe3cf', '#f6d2b8', '#e9b996', '#c98e68', '#9a6648', '#6e4632'];
export const HAIRS = ['#2a2126', '#4a3226', '#7a4a2e', '#c99a5a', '#e8d6a8', '#b8b8c0', '#3a5aa8', '#d85a7a', '#5ab88a', '#f0f0f4'];
export const OUTFIT_COLORS = ['#3a6ea8', '#c8442f', '#3e8a5a', '#8a5ab8', '#e0a030', '#2a2a36', '#e88aa8', '#f2efe6'];
export const EYES = ['#5a3a2a', '#2a4a7a', '#3a6a3a', '#7a2a4a', '#5a5a6a'];

export class Character {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  readonly armL = new THREE.Group();
  readonly armR = new THREE.Group();
  readonly legL = new THREE.Group();
  readonly legR = new THREE.Group();
  private faceMat: THREE.MeshBasicMaterial;
  private faceTex: THREE.Texture;
  expr: Expr = 'neutral';
  private blinkT = 2 + Math.random() * 3;
  private blinking = 0;
  private phase = Math.random() * 10;
  speed = 0;
  /** 0..1 run blend */
  run = 0;
  talking = false;
  private talkT = 0;
  private bowT = -1;
  private waveT = -1;
  private jumpT = -1;
  airY = 0;
  private emoteT = -1;
  heightM = 1.55;
  private shadowBlob: THREE.Mesh;

  constructor(readonly look: Look3D) {
    const s = look.scale ?? 1;
    this.root.add(this.body);
    this.body.add(this.head);
    this.body.add(this.armL, this.armR);
    this.root.add(this.legL, this.legR);
    const mat = look.ghost ? ghostMaterial() : sharedToon();

    // ── legs (pivot at hip)
    const legLen = look.outfit === 'kid' ? 0.36 : 0.44;
    for (const [g, side] of [[this.legL, -1], [this.legR, 1]] as [THREE.Group, number][]) {
      const b = new Builder();
      const pants = ['kimono', 'yukata', 'miko', 'monk', 'schoolF', 'idol', 'priest'].includes(look.outfit) ? look.skin : look.bottom;
      b.cyl(0.075, 0.07, legLen, look.outfit === 'miko' || look.outfit === 'samurai' || look.outfit === 'priest' ? look.bottom : pants, { y: -legLen / 2 });
      const shoe = look.outfit === 'kimono' || look.outfit === 'yukata' || look.outfit === 'miko' ? '#f2efe6' : look.outfit === 'samurai' || look.outfit === 'monk' ? '#c9a878' : '#3a3036';
      b.box(0.14, 0.07, 0.22, shoe, { y: -legLen - 0.01, z: 0.03 });
      if (look.outfit === 'kimono' || look.outfit === 'yukata' || look.outfit === 'miko') b.box(0.12, 0.04, 0.2, '#6a4a32', { y: -legLen - 0.05, z: 0.03 });
      const m = new THREE.Mesh(b.geometry(), mat);
      m.castShadow = true;
      g.add(m);
      g.position.set(side * 0.1, legLen + 0.02, 0);
    }
    const hip = legLen + 0.02;

    // ── torso
    {
      const b = new Builder();
      const o = look.outfit;
      const torsoH = 0.5;
      const ty = hip + torsoH / 2;
      const long = ['kimono', 'yukata', 'miko', 'monk', 'samurai', 'priest', 'elder'].includes(o);
      if (long) {
        // robe flaring down over the legs
        b.cyl(0.2, o === 'samurai' || o === 'miko' || o === 'priest' ? 0.34 : 0.28, 0.62, o === 'miko' || o === 'samurai' || o === 'priest' ? look.bottom : look.top, { y: hip - 0.08 });
        b.cyl(0.19, 0.22, torsoH, look.top, { y: ty });
        // collar V
        b.box(0.05, 0.3, 0.02, look.accent, { y: ty + 0.1, z: 0.2, rz: 0.5 });
        b.box(0.05, 0.3, 0.02, look.accent, { y: ty + 0.1, z: 0.2, rz: -0.5 });
        // obi
        b.cyl(0.215, 0.215, 0.12, o === 'monk' ? '#3a3036' : look.accent, { y: hip + 0.12 });
        if (o === 'kimono' || o === 'yukata') b.box(0.26, 0.2, 0.08, look.accent, { y: hip + 0.12, z: -0.22 });
      } else {
        b.cyl(0.19, 0.21, torsoH, look.top, { y: ty });
        if (o === 'schoolF') {
          b.cyl(0.21, 0.3, 0.26, look.bottom, { y: hip - 0.06 });
          b.box(0.36, 0.12, 0.02, '#ffffff', { y: ty + 0.2, z: 0.17, rx: -0.3 });
          b.box(0.08, 0.14, 0.02, look.accent, { y: ty + 0.1, z: 0.2 });
        } else if (o === 'idol') {
          b.cyl(0.2, 0.32, 0.24, look.bottom, { y: hip - 0.05 });
          b.box(0.2, 0.1, 0.04, look.accent, { y: ty + 0.15, z: 0.19 });
        } else if (o === 'gyaru') {
          b.cyl(0.2, 0.26, 0.2, look.bottom, { y: hip - 0.04 });
        } else {
          b.cyl(0.2, 0.2, 0.14, look.bottom, { y: hip + 0.02 });
        }
        if (o === 'schoolM' || o === 'suit') {
          b.box(0.06, 0.3, 0.02, '#f2efe6', { y: ty + 0.05, z: 0.195 });
          if (o === 'suit') b.box(0.04, 0.22, 0.025, look.accent, { y: ty + 0.03, z: 0.205 });
          for (let i = 0; i < 3; i++) b.sphere(0.018, '#d8c070', { y: ty + 0.12 - i * 0.12, z: 0.2, x: 0.05 }, 0);
        }
        if (o === 'apron' || o === 'chef') b.box(0.3, 0.55, 0.03, o === 'chef' ? '#ffffff' : look.accent, { y: ty - 0.12, z: 0.19 });
        if (o === 'doctor') b.cyl(0.21, 0.25, 0.7, '#ffffff', { y: ty - 0.12 });
        if (o === 'traveler') {
          // scarf
          b.add(new THREE.TorusGeometry(0.17, 0.05, 6, 12), look.accent, { y: hip + torsoH - 0.02, rx: Math.PI / 2 });
          b.box(0.09, 0.3, 0.04, look.accent, { x: 0.08, y: hip + torsoH - 0.18, z: 0.17, rz: 0.15 });
          b.box(0.4, 0.05, 0.02, '#6a4a32', { y: ty, z: 0.0, rx: 0, ry: 0, rz: 0.8, sx: 1 });
        }
        if (o === 'fisher') b.box(0.42, 0.06, 0.42, look.accent, { y: hip + 0.14 });
      }
      if (look.backpack || o === 'traveler' || o === 'otaku') {
        b.box(0.3, 0.36, 0.16, o === 'otaku' ? '#3a3a48' : '#8a5a3a', { y: ty + 0.02, z: -0.24 });
        b.box(0.32, 0.12, 0.17, o === 'otaku' ? '#5a5a6a' : '#6a4228', { y: ty + 0.18, z: -0.245 });
        if (o === 'traveler') b.cyl(0.07, 0.07, 0.34, '#c8442f', { y: ty + 0.28, z: -0.24, rz: Math.PI / 2 });
      }
      const m = new THREE.Mesh(b.geometry(), mat);
      m.castShadow = true;
      this.body.add(m);
    }
    const shoulderY = hip + 0.46;

    // ── arms (pivot at shoulder)
    for (const [g, side] of [[this.armL, -1], [this.armR, 1]] as [THREE.Group, number][]) {
      const b = new Builder();
      const sleeve = ['kimono', 'yukata', 'miko', 'monk', 'priest'].includes(look.outfit);
      if (sleeve) b.cyl(0.09, 0.14, 0.34, look.top, { y: -0.17 });
      else b.cyl(0.06, 0.055, 0.34, look.outfit === 'gyaru' || look.outfit === 'kid' ? look.skin : look.top, { y: -0.17 });
      b.sphere(0.06, look.skin, { y: -0.38 }, 1);
      const m = new THREE.Mesh(b.geometry(), mat);
      m.castShadow = true;
      g.add(m);
      g.position.set(side * 0.235, shoulderY, 0);
      g.rotation.z = side * 0.12;
    }

    // ── head
    const headY = shoulderY + 0.33;
    this.head.position.y = headY;
    {
      const b = new Builder();
      b.cyl(0.06, 0.07, 0.1, look.skin, { y: -0.27 });
      b.add(new THREE.SphereGeometry(0.31, 20, 16), look.skin, { sy: 0.95, sx: 1.02 });
      // ears
      for (const sd of [-1, 1]) b.sphere(0.06, look.skin, { x: sd * 0.3, y: -0.02 }, 1);
      this.hair(b, look);
      this.hatGeo(b, look);
      const m = new THREE.Mesh(b.geometry(), mat);
      m.castShadow = true;
      this.head.add(m);
    }
    // face plane with expression atlas
    this.faceTex = faceAtlas(look.eyes, { lashes: look.lashes, glasses: look.glasses, old: look.old }).clone();
    this.faceTex.needsUpdate = true;
    this.faceTex.repeat.set(0.25, 0.5);
    this.faceMat = new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, depthWrite: false, opacity: look.ghost ? 0.75 : 1 });
    const fg = new THREE.SphereGeometry(0.312, 24, 16, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.28, Math.PI * 0.5);
    // remap the spherical patch UVs to 0..1
    const uv = fg.attributes.uv as THREE.BufferAttribute;
    let u0 = 1, u1 = 0, v0 = 1, v1 = 0;
    for (let i = 0; i < uv.count; i++) {
      u0 = Math.min(u0, uv.getX(i));
      u1 = Math.max(u1, uv.getX(i));
      v0 = Math.min(v0, uv.getY(i));
      v1 = Math.max(v1, uv.getY(i));
    }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - u0) / (u1 - u0), (uv.getY(i) - v0) / (v1 - v0));
    const face = new THREE.Mesh(fg, this.faceMat);
    face.scale.set(1.02, 0.97, 1.02);
    face.rotation.y = 0;
    face.renderOrder = 2;
    this.head.add(face);
    this.setExpr('neutral');

    this.root.scale.setScalar(s);
    this.heightM = (headY + 0.35) * s;
    // soft contact shadow
    this.shadowBlob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.03;
    this.root.add(this.shadowBlob);
  }

  private hair(b: Builder, l: Look3D) {
    const c = l.hair;
    const st = l.hairStyle;
    if (st === 'bald') {
      if (l.old) for (const sd of [-1, 1]) b.sphere(0.12, c, { x: sd * 0.25, y: 0.0, z: -0.05, sy: 0.8 }, 1);
      return;
    }
    // cap of hair (back/top), slightly larger than the head
    b.add(new THREE.SphereGeometry(0.335, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), c, { y: 0.02, sy: 1.0 });
    b.add(new THREE.SphereGeometry(0.33, 18, 12, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 0.3, Math.PI * 0.45), c, { y: 0.0 });
    // bangs: a few wedges over the forehead
    const bangs = st === 'spiky' || st === 'messy' ? 6 : 5;
    for (let i = 0; i < bangs; i++) {
      const a = -0.75 + (i / (bangs - 1)) * 1.5;
      b.cone(0.09, st === 'spiky' ? 0.3 : 0.22, c, { x: Math.sin(a) * 0.26, y: 0.16 - Math.abs(a) * 0.04, z: Math.cos(a) * 0.24, rx: 2.5, rz: -a * 0.5 }, 5);
    }
    if (st === 'spiky' || st === 'messy') for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.cone(0.09, 0.3, c, { x: Math.cos(a) * 0.2, y: 0.26, z: Math.sin(a) * 0.2 - 0.05, rx: Math.sin(a) * 0.9, rz: -Math.cos(a) * 0.9 }, 5);
    }
    if (st === 'long' || st === 'twin' || st === 'pony' || st === 'bob') {
      // side locks
      for (const sd of [-1, 1]) b.box(0.1, st === 'bob' ? 0.32 : 0.5, 0.16, c, { x: sd * 0.29, y: st === 'bob' ? -0.12 : -0.22, z: 0.05 });
    }
    if (st === 'long') b.box(0.5, 0.65, 0.16, c, { y: -0.25, z: -0.22, rx: 0.1 });
    if (st === 'bob') b.add(new THREE.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.35), c, { y: 0.02 });
    if (st === 'pony') {
      b.sphere(0.08, l.accent, { y: 0.12, z: -0.32 }, 1);
      b.cone(0.13, 0.55, c, { y: -0.12, z: -0.4, rx: 0.4 + Math.PI }, 7);
    }
    if (st === 'twin') for (const sd of [-1, 1]) {
      b.sphere(0.07, l.accent, { x: sd * 0.3, y: 0.12, z: -0.08 }, 1);
      b.cone(0.11, 0.5, c, { x: sd * 0.38, y: -0.15, z: -0.08, rz: sd * 0.25 + Math.PI }, 7);
    }
    if (st === 'bun') {
      b.sphere(0.15, c, { y: 0.32, z: -0.12 }, 1);
      b.cyl(0.01, 0.01, 0.34, l.accent, { y: 0.34, z: -0.12, rz: 1.1 }, 4);
    }
    if (st === 'topknot') {
      b.cyl(0.05, 0.05, 0.22, c, { y: 0.34, z: -0.02, rx: 1.2 }, 6);
      b.box(0.22, 0.04, 0.3, '#7a7a82', { y: 0.31, sx: 1 });
    }
  }

  private hatGeo(b: Builder, l: Look3D) {
    switch (l.hat) {
      case 'straw':
        b.cone(0.55, 0.3, '#d8b870', { y: 0.34 }, 18);
        b.cyl(0.56, 0.56, 0.02, '#c9a85a', { y: 0.22 }, 18);
        break;
      case 'headband':
        b.add(new THREE.TorusGeometry(0.315, 0.035, 6, 20), l.accent, { y: 0.12, rx: Math.PI / 2 + 0.15 });
        break;
      case 'cap':
        b.add(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), l.accent, { y: 0.06 });
        b.box(0.3, 0.03, 0.22, l.accent, { y: 0.1, z: 0.32 });
        break;
      case 'kerchief':
        b.add(new THREE.SphereGeometry(0.345, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), l.accent, { y: 0.04 });
        break;
      case 'eboshi':
        b.cyl(0.12, 0.2, 0.45, '#1e1c22', { y: 0.5, rx: -0.2 }, 10);
        break;
      case 'chef':
        b.cyl(0.26, 0.24, 0.36, '#ffffff', { y: 0.42 }, 14);
        b.sphere(0.27, '#ffffff', { y: 0.6, sy: 0.6 }, 1);
        break;
      case 'bow':
        b.sphere(0.08, l.accent, { y: 0.3, z: -0.05 }, 1);
        for (const sd of [-1, 1]) b.cone(0.09, 0.2, l.accent, { x: sd * 0.12, y: 0.3, z: -0.05, rz: sd * -Math.PI / 2 }, 4);
        break;
      case 'cat':
        for (const sd of [-1, 1]) b.cone(0.1, 0.2, l.hair, { x: sd * 0.2, y: 0.32, rz: -sd * 0.3 }, 4);
        break;
    }
  }

  setExpr(e: Expr) {
    this.expr = e;
    const u = exprUV(e);
    this.faceTex.offset.set(u.x, u.y);
  }

  bow() {
    this.bowT = 0;
  }
  wave() {
    this.waveT = 0;
  }
  jump() {
    if (this.jumpT < 0) this.jumpT = 0;
  }
  emote(e: Expr, secs = 1.6) {
    this.setExpr(e);
    this.emoteT = secs;
  }
  get jumping() {
    return this.jumpT >= 0;
  }

  update(dt: number) {
    this.phase += dt * (this.speed > 0.1 ? 4.2 + this.run * 3.2 : 1.6);
    const sp = Math.min(1, this.speed / 3.2);
    const swing = Math.sin(this.phase) * (0.65 + this.run * 0.35) * sp;
    this.legL.rotation.x = damp(this.legL.rotation.x, swing, 18, dt);
    this.legR.rotation.x = damp(this.legR.rotation.x, -swing, 18, dt);
    let armX = -swing * 0.8;
    // idle breathing / walking bob
    const bob = sp > 0.05 ? Math.abs(Math.sin(this.phase)) * 0.05 * sp : Math.sin(this.phase) * 0.008;
    this.body.position.y = bob;
    this.body.rotation.x = damp(this.body.rotation.x, this.run * 0.18 * sp, 8, dt);
    let armRz = 0.12, armLz = -0.12, armRx = -armX;
    // bow (お辞儀)
    if (this.bowT >= 0) {
      this.bowT += dt;
      const k = this.bowT < 0.35 ? this.bowT / 0.35 : this.bowT < 1.0 ? 1 : Math.max(0, 1 - (this.bowT - 1.0) / 0.4);
      this.body.rotation.x = 0.55 * k;
      this.head.rotation.x = 0.15 * k;
      armX = 0;
      armRx = 0;
      if (this.bowT > 1.4) this.bowT = -1;
    }
    if (this.waveT >= 0) {
      this.waveT += dt;
      armRz = 2.6 + Math.sin(this.waveT * 12) * 0.35;
      armRx = 0;
      if (this.waveT > 1.6) this.waveT = -1;
    }
    this.armL.rotation.x = damp(this.armL.rotation.x, armX, 14, dt);
    this.armR.rotation.x = damp(this.armR.rotation.x, armRx, 14, dt);
    this.armR.rotation.z = damp(this.armR.rotation.z, armRz, 10, dt);
    this.armL.rotation.z = damp(this.armL.rotation.z, armLz, 10, dt);
    // jump
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      const T = 0.62;
      const k = this.jumpT / T;
      this.airY = Math.max(0, Math.sin(Math.min(1, k) * Math.PI)) * 0.9;
      this.legL.rotation.x = -0.6 * Math.sin(Math.min(1, k) * Math.PI);
      this.legR.rotation.x = 0.3 * Math.sin(Math.min(1, k) * Math.PI);
      if (k >= 1) {
        this.jumpT = -1;
        this.airY = 0;
      }
    }
    this.shadowBlob.position.y = 0.03 - this.airY;
    (this.shadowBlob.material as THREE.MeshBasicMaterial).opacity = 0.22 * (1 - this.airY * 0.6);
    // talking: mouth flaps + small head nods
    if (this.talking) {
      this.talkT += dt;
      const open = Math.sin(this.talkT * 16) > 0.1;
      if (this.emoteT <= 0 && this.blinking <= 0) this.setExpr(open ? 'talk' : 'neutral');
      this.head.rotation.x = Math.sin(this.talkT * 5) * 0.04;
    } else if (this.bowT < 0) this.head.rotation.x = damp(this.head.rotation.x, 0, 6, dt);
    // blinking
    if (this.emoteT > 0) {
      this.emoteT -= dt;
      if (this.emoteT <= 0) this.setExpr('neutral');
    } else {
      this.blinkT -= dt;
      if (this.blinkT <= 0 && this.blinking <= 0) {
        this.blinking = 0.12;
        this.setExpr('blink');
      }
      if (this.blinking > 0) {
        this.blinking -= dt;
        if (this.blinking <= 0) {
          this.setExpr('neutral');
          this.blinkT = 2 + Math.random() * 4;
        }
      }
    }
  }
}

function ghostMaterial(): THREE.Material {
  return new THREE.MeshToonMaterial({ vertexColors: true, transparent: true, opacity: 0.55, emissive: new THREE.Color('#4a7aff'), emissiveIntensity: 0.6 });
}

// ───────────────────────── Kon, the fox spirit ─────────────────────────

export class Kon {
  readonly root = new THREE.Group();
  private bodyG = new THREE.Group();
  private tails: THREE.Group[] = [];
  private glow: THREE.Sprite;
  private faceTex: THREE.Texture;
  private t = Math.random() * 10;
  private tailCount = 1;
  expr: Expr = 'happy';
  talking = false;
  private talkT = 0;
  private emoteT = 0;
  private blinkT = 3;

  constructor() {
    const mat = sharedToon();
    const b = new Builder();
    const fur = '#fff6ec', orange = '#f29a3e', pink = '#ffb3c4';
    // body (sitting, floating)
    b.add(new THREE.SphereGeometry(0.22, 16, 12), fur, { y: 0.0, sy: 1.15 });
    b.add(new THREE.SphereGeometry(0.2, 12, 10), orange, { y: 0.05, z: -0.06, sy: 1.1 });
    // paws
    for (const s of [-1, 1]) b.sphere(0.06, fur, { x: s * 0.09, y: -0.22, z: 0.1 }, 1);
    // red bib (yodarekake) like the shrine foxes
    b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 14, 1, true), '#d8432f', { y: 0.16 });
    const body = new THREE.Mesh(b.geometry(), mat);
    this.bodyG.add(body);
    // head
    const hb = new Builder();
    hb.add(new THREE.SphereGeometry(0.2, 18, 14), fur, { sy: 0.92 });
    hb.add(new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), orange, { y: 0.02, z: -0.02 });
    hb.cone(0.09, 0.16, fur, { z: 0.2, y: -0.04, rx: Math.PI / 2 }, 10);
    hb.sphere(0.03, '#2a1c1c', { z: 0.28, y: -0.04 }, 1);
    for (const s of [-1, 1]) {
      hb.cone(0.08, 0.2, orange, { x: s * 0.12, y: 0.2, z: -0.02, rz: -s * 0.35 }, 6);
      hb.cone(0.045, 0.12, pink, { x: s * 0.115, y: 0.19, z: 0.01, rz: -s * 0.35 }, 6);
      // red marks
      hb.box(0.03, 0.08, 0.01, '#d8432f', { x: s * 0.07, y: 0.13, z: 0.16, rz: s * 0.3 });
    }
    const head = new THREE.Mesh(hb.geometry(), mat);
    head.position.set(0, 0.34, 0.02);
    this.bodyG.add(head);
    this.faceTex = faceAtlas('#c8442f', { fox: true, blush: true }).clone();
    this.faceTex.needsUpdate = true;
    this.faceTex.repeat.set(0.25, 0.5);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, depthWrite: false }),
    );
    face.position.set(0, 0.35, 0.205);
    head.userData.face = face;
    this.bodyG.add(face);
    this.setExpr('happy');
    this.root.add(this.bodyG);
    this.setTails(1);
    // spirit glow
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffd9a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, toneMapped: false }));
    this.glow.scale.set(1.6, 1.6, 1);
    this.glow.position.y = 0.15;
    this.root.add(this.glow);
  }

  /** Kon grows tails as the player learns (1 → 9) */
  setTails(n: number) {
    n = Math.max(1, Math.min(9, n));
    if (n === this.tailCount && this.tails.length) return;
    this.tailCount = n;
    for (const t of this.tails) this.bodyG.remove(t);
    this.tails = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const b = new Builder();
      const segs = 5;
      for (let k = 0; k < segs; k++) {
        const t = k / (segs - 1);
        b.sphere(0.09 + Math.sin(t * Math.PI) * 0.06, t > 0.75 ? '#fff6ec' : '#f29a3e', { y: t * 0.42, z: -t * 0.12 }, 1);
      }
      const m = new THREE.Mesh(b.geometry(), sharedToon());
      g.add(m);
      // glowing tip
      const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffe3a8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      tip.scale.set(0.35, 0.35, 1);
      tip.position.set(0, 0.45, -0.12);
      g.add(tip);
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.min(2.4, n * 0.32);
      g.position.set(0, -0.12, -0.18);
      g.rotation.set(-0.9, 0, spread);
      g.userData.base = spread;
      this.tails.push(g);
      this.bodyG.add(g);
    }
  }

  setExpr(e: Expr) {
    this.expr = e;
    const u = exprUV(e);
    this.faceTex.offset.set(u.x, u.y);
  }
  emote(e: Expr, secs = 1.6) {
    this.setExpr(e);
    this.emoteT = secs;
  }

  update(dt: number) {
    this.t += dt;
    this.bodyG.position.y = Math.sin(this.t * 2.1) * 0.08;
    this.bodyG.rotation.z = Math.sin(this.t * 1.3) * 0.05;
    this.tails.forEach((g, i) => {
      g.rotation.z = (g.userData.base as number) + Math.sin(this.t * 2.4 + i * 0.7) * 0.18;
      g.rotation.x = -0.9 + Math.sin(this.t * 1.7 + i) * 0.12;
    });
    (this.glow.material as THREE.SpriteMaterial).opacity = 0.45 + Math.sin(this.t * 2) * 0.12;
    if (this.talking) {
      this.talkT += dt;
      if (this.emoteT <= 0) this.setExpr(Math.sin(this.talkT * 15) > 0 ? 'talk' : 'happy');
    } else if (this.emoteT > 0) {
      this.emoteT -= dt;
      if (this.emoteT <= 0) this.setExpr('happy');
    } else {
      this.blinkT -= dt;
      if (this.blinkT < 0) {
        this.setExpr('blink');
        if (this.blinkT < -0.12) {
          this.setExpr('happy');
          this.blinkT = 2.5 + Math.random() * 3;
        }
      }
    }
  }
}

export function randomLook(seed: number, outfit?: Outfit): Look3D {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const p = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const o = outfit ?? p<Outfit>(['casual', 'kimono', 'yukata', 'apron', 'elder', 'kid', 'fisher', 'suit']);
  return {
    skin: p(SKINS.slice(0, 4)),
    hair: o === 'elder' ? p(['#b8b8c0', '#e8e8ee', '#8a8a92']) : p(HAIRS.slice(0, 5)),
    hairStyle: p<HairStyle>(['short', 'long', 'pony', 'bun', 'bob', 'messy']),
    outfit: o,
    top: p(OUTFIT_COLORS),
    bottom: p(['#2a2a36', '#4a4a5a', '#3a5a8a', '#6a4a3a', '#2a3a4a']),
    accent: p(['#c8442f', '#e9c46a', '#3a6ea8', '#e88aa8', '#5fd3a2']),
    eyes: p(EYES),
    glasses: r() < 0.15,
    hat: o === 'fisher' ? 'straw' : r() < 0.15 ? p<Hat>(['straw', 'headband', 'cap', 'kerchief']) : 'none',
    scale: o === 'kid' ? 0.78 : 1,
    old: o === 'elder',
  };
}

export { leafGeometry, lerp };

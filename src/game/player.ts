/** Third-person player controller and the orbit camera rig. */
import * as THREE from 'three';
import type { Input } from '../core/input';
import type { World } from '../world/world';
import { Character, type Look3D } from '../world/characters';
import { heightAt } from '../world/terrain';
import { angleDiff, clamp, damp } from '../core/util';
import { sfx } from '../audio/sfx';

export interface Platform {
  x: number;
  z: number;
  hw: number;
  hd: number;
  rot: number;
  y: number;
  /** arched: y + sin(t*π)*arch along local z */
  arch?: number;
}

export class Player {
  readonly char: Character;
  pos = new THREE.Vector3();
  yaw = 0;
  vel = new THREE.Vector2();
  frozen = false;
  platforms: Platform[] = [];
  private stepT = 0;
  readonly radius = 0.38;

  constructor(look: Look3D, private world: World, private input: Input) {
    this.char = new Character(look);
    world.scene.add(this.char.root);
  }

  setLook(look: Look3D) {
    const parent = this.char.root.parent;
    parent?.remove(this.char.root);
    (this as { char: Character }).char = new Character(look);
    parent?.add(this.char.root);
    this.sync();
  }

  place(x: number, z: number, yaw = 0) {
    this.pos.set(x, this.groundAt(x, z), z);
    this.yaw = yaw;
    this.sync();
  }

  groundAt(x: number, z: number): number {
    let y = heightAt(x, z);
    for (const p of this.platforms) {
      const c = Math.cos(p.rot), s = Math.sin(p.rot);
      const lx = (x - p.x) * c - (z - p.z) * s;
      const lz = (x - p.x) * s + (z - p.z) * c;
      if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd) {
        const py = p.arch ? p.y + Math.sin(((lz + p.hd) / (2 * p.hd)) * Math.PI) * p.arch : p.y;
        if (py > y - 0.5) y = Math.max(y, py);
      }
    }
    return y;
  }

  update(dt: number, camYaw: number) {
    const inp = this.input;
    const mx = this.frozen ? 0 : inp.move.x, my = this.frozen ? 0 : inp.move.y;
    const mag = Math.min(1, Math.hypot(mx, my));
    const run = inp.run && mag > 0.5;
    const maxSpeed = run ? 7.2 : 3.6;
    let tx = 0, tz = 0;
    if (mag > 0.05) {
      // camera-relative direction
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      tx = (fx * my + rx * mx) * maxSpeed * mag;
      tz = (fz * my + rz * mx) * maxSpeed * mag;
      const targetYaw = Math.atan2(tx, tz);
      this.yaw += angleDiff(this.yaw, targetYaw) * Math.min(1, dt * 12);
    }
    this.vel.x = damp(this.vel.x, tx, 10, dt);
    this.vel.y = damp(this.vel.y, tz, 10, dt);
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.y * dt;
    [nx, nz] = this.world.col.resolve(nx, nz, this.radius);
    // no walking into deep water or up cliffs
    const gy = this.groundAt(nx, nz);
    const cur = this.pos.y;
    const slope = (gy - cur) / Math.max(0.001, Math.hypot(nx - this.pos.x, nz - this.pos.z));
    if (gy < -0.55 || (slope > 2.2 && gy - cur > 0.6)) {
      nx = this.pos.x;
      nz = this.pos.z;
      this.vel.set(0, 0);
    }
    this.pos.x = nx;
    this.pos.z = nz;
    this.pos.y = damp(this.pos.y, this.groundAt(nx, nz), 20, dt);
    const speed = Math.hypot(this.vel.x, this.vel.y);
    this.char.speed = speed;
    this.char.run = damp(this.char.run, run ? 1 : 0, 6, dt);
    if (!this.frozen && inp.take('jump')) {
      if (!this.char.jumping) sfx.jump();
      this.char.jump();
    }
    // footsteps
    if (speed > 0.8 && !this.char.jumping) {
      this.stepT -= dt * speed;
      if (this.stepT <= 0) {
        this.stepT = 1.25;
        const y = this.pos.y;
        sfx.step(y < 2.2 ? 'sand' : this.onPlatform() ? 'wood' : 'grass');
      }
    }
    this.char.update(dt);
    this.sync();
  }

  onPlatform(): boolean {
    return this.groundAt(this.pos.x, this.pos.z) > heightAt(this.pos.x, this.pos.z) + 0.2;
  }

  sync() {
    this.char.root.position.set(this.pos.x, this.pos.y + this.char.airY, this.pos.z);
    this.char.root.rotation.y = this.yaw;
  }

  /** turn smoothly toward a point (talking to someone) */
  face(x: number, z: number) {
    this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.sync();
  }
}

export class CameraRig {
  yaw = Math.PI;
  pitch = 0.32;
  dist = 7.5;
  minDist = 3;
  maxDist = 16;
  target = new THREE.Vector3();
  private cur = new THREE.Vector3();
  /** cinematic override: when set, the camera eases to these */
  override: { pos: THREE.Vector3; look: THREE.Vector3; k: number } | null = null;
  private lookCur = new THREE.Vector3();
  shake = 0;

  constructor(readonly cam: THREE.PerspectiveCamera) {}

  snap(target: THREE.Vector3) {
    this.target.copy(target);
    this.cur.copy(this.idealPos());
    this.cam.position.copy(this.cur);
    this.lookCur.copy(target).add(new THREE.Vector3(0, 1.3, 0));
    this.cam.lookAt(this.lookCur);
  }

  private idealPos(): THREE.Vector3 {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return new THREE.Vector3(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + 1.4 + sp * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
  }

  update(dt: number, look: { x: number; y: number; zoom: number }, follow: THREE.Vector3, autoYawBehind?: number) {
    this.yaw -= look.x;
    this.pitch = clamp(this.pitch + look.y, -0.15, 1.2);
    this.dist = clamp(this.dist + look.zoom * this.dist * 0.6, this.minDist, this.maxDist);
    // gently swing behind the player while walking (only when the player isn't steering the camera)
    if (autoYawBehind !== undefined && Math.abs(look.x) < 1e-4) this.yaw += angleDiff(this.yaw, autoYawBehind + Math.PI) * Math.min(1, dt * 0.6);
    this.target.lerp(follow, Math.min(1, dt * 10));
    if (this.override) {
      const o = this.override;
      this.cur.lerp(o.pos, Math.min(1, dt * o.k));
      this.lookCur.lerp(o.look, Math.min(1, dt * o.k));
      this.cam.position.copy(this.cur);
      this.cam.lookAt(this.lookCur);
      return;
    }
    const ideal = this.idealPos();
    // keep the camera above the terrain
    const g = heightAt(ideal.x, ideal.z) + 0.6;
    if (ideal.y < g) ideal.y = g;
    this.cur.lerp(ideal, Math.min(1, dt * 12));
    this.cam.position.copy(this.cur);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2);
      this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.3;
      this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.3;
    }
    this.lookCur.lerp(new THREE.Vector3(this.target.x, this.target.y + 1.3, this.target.z), Math.min(1, dt * 14));
    this.cam.lookAt(this.lookCur);
  }
}

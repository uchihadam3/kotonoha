/**
 * The 3D world: scene, lights, sky with day/night, terrain, water, regions (built on demand near the
 * player), the Great Tree, ambient particles, and the "colour returns" grading per place.
 */
import * as THREE from 'three';
import { Sky } from './sky';
import { Water, heightTexture } from './water';
import { buildGrid, buildTerrainMesh, Collision, heightAt, WORLD } from './terrain';
import type { Engine } from '../core/engine';
import { REGIONS, TREE_POS, type RegionDef } from '../data/regions';
import { GreatTree } from './greattree';
import { Vegetation, updateWind } from './nature';
import { Bursts, Falling, Fireflies } from './particles';
import { glowUniform } from './kit';
import { Grass } from './grass';

export class World {
  readonly scene = new THREE.Scene();
  readonly sky: Sky;
  readonly water: Water;
  readonly terrain: THREE.Mesh;
  readonly col = new Collision();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly updaters = new Set<(dt: number, t: number) => void>();
  /** world clock 0..1 */
  clock = 0.3;
  /** real seconds per full day */
  dayLength = 1200;
  clockFrozen = false;
  focus = new THREE.Vector3();
  private shadowSize = 70;
  readonly tree: GreatTree;
  readonly treeBase = new THREE.Vector3();
  readonly veg: Vegetation;
  readonly bursts = new Bursts();
  readonly treeLeaves: Falling;
  readonly petals: Falling;
  readonly fireflies: Fireflies;
  readonly grass: Grass | null;

  constructor(readonly engine: Engine) {
    const grid = buildGrid();
    this.scene.fog = new THREE.FogExp2(0xcfe3f2, 0.0013);
    this.sky = new Sky();
    this.scene.add(this.sky.group);
    this.terrain = buildTerrainMesh();
    this.scene.add(this.terrain);
    const half = WORLD.size / 2;
    const htex = heightTexture(grid, WORLD.seg + 1);
    this.water = new Water(htex, [WORLD.cx - half, WORLD.cz - half, WORLD.size]);
    this.scene.add(this.water.group);
    const blades = engine.quality === 'alta' ? 22000 : engine.quality === 'media' ? 9000 : 0;
    this.grass = blades ? new Grass(htex, blades, 54) : null;
    if (this.grass) this.scene.add(this.grass.mesh);

    this.hemi = new THREE.HemisphereLight(0xcfe4fa, 0x6f6d4c, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = engine.quality !== 'baixa';
    const ss = engine.quality === 'alta' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ss, ss);
    const sc = this.sun.shadow.camera;
    sc.left = -this.shadowSize;
    sc.right = this.shadowSize;
    sc.top = this.shadowSize;
    sc.bottom = -this.shadowSize;
    sc.near = 1;
    sc.far = 400;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.tree = new GreatTree(1, engine.quality === 'baixa' ? 'low' : 'high');
    this.treeBase.set(TREE_POS.x, heightAt(TREE_POS.x, TREE_POS.z) - 0.5, TREE_POS.z);
    this.tree.group.position.copy(this.treeBase);
    this.scene.add(this.tree.group);
    this.col.circle(TREE_POS.x, TREE_POS.z, 6.5, 'tree');

    this.veg = new Vegetation(engine.quality === 'alta' ? 1 : engine.quality === 'media' ? 0.7 : 0.45);
    this.scene.add(this.veg.group);
    this.scene.add(this.bursts.group);
    this.treeLeaves = new Falling({ count: 260, radius: 34, height: 60, kind: 'leaf', color: '#7ff0c4', glow: 1, speed: 0.7 });
    this.treeLeaves.center = new THREE.Vector3(this.treeBase.x, this.treeBase.y + 2, this.treeBase.z);
    this.scene.add(this.treeLeaves.mesh);
    this.petals = new Falling({ count: engine.quality === 'baixa' ? 120 : 260, radius: 30, height: 16, kind: 'petal', speed: 1.2, size: 0.2 });
    this.scene.add(this.petals.mesh);
    this.fireflies = new Fireflies(engine.quality === 'baixa' ? 40 : 90, 24);
    this.scene.add(this.fireflies.points);
  }

  /** builds the scattered vegetation (after regions placed their own trees) */
  finishVegetation() {
    this.veg.build();
  }

  regionAt(x: number, z: number): RegionDef | null {
    let best: RegionDef | null = null, bd = 1e9;
    for (const r of REGIONS) {
      const d = Math.hypot(x - r.x, z - r.z) - r.r;
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return bd < 25 ? best : null;
  }

  nearestRegion(x: number, z: number): RegionDef {
    let best = REGIONS[0], bd = 1e9;
    for (const r of REGIONS) {
      const d = Math.hypot(x - r.x, z - r.z);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  ground(x: number, z: number) {
    return heightAt(x, z);
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    if (!this.clockFrozen) this.clock = (this.clock + dt / this.dayLength) % 1;
    this.sky.update(this.clock, camera.position, t);
    const S = this.sky.state;
    this.hemi.color.copy(S.hemiSky);
    this.hemi.groundColor.copy(S.hemiGround);
    this.hemi.intensity = S.hemiI;
    this.sun.color.copy(S.sunColor);
    this.sun.intensity = S.sunI;
    // shadow box follows the focus point
    const f = this.focus;
    this.sun.position.set(f.x + S.sunDir.x * 160, f.y + S.sunDir.y * 160, f.z + S.sunDir.z * 160);
    this.sun.target.position.copy(f);
    this.sun.target.updateMatrixWorld();
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(S.fog);
    this.water.update(t, S);
    this.grass?.update(t, camera.position, S.sunColor, S.sunI, S.hemiSky, S.hemiI);
    glowUniform.value = Math.min(1, S.night * 1.2);
    updateWind(t, 1);
    this.veg.update(camera.position);
    this.tree.update(t, S.night, S.fog, 1);
    this.treeLeaves.update(t);
    this.petals.center = new THREE.Vector3(f.x, f.y - 1, f.z);
    this.petals.update(t);
    this.fireflies.points.position.set(f.x, f.y, f.z);
    this.fireflies.opacity = Math.max(0, S.night - 0.3) * 1.4;
    this.fireflies.update(t, this.engine.pixelRatio);
    this.bursts.update(dt);
    for (const u of this.updaters) u(dt, t);
  }
}

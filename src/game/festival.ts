/**
 * The summer festival (夏祭り) on the shopping street: at night extra rows of paper lanterns, 祭 banners and
 * floating lights appear, and the shooting gallery pays double.
 */
import * as THREE from 'three';
import type { Game } from './game';
import { Builder } from '../world/kit';
import { lanternString, paperLantern } from '../world/buildings';
import { heightAt } from '../world/terrain';
import { REGION_BY_ID } from '../data/regions';
import { sfx } from '../audio/sfx';

export class Festival {
  readonly group: THREE.Group;
  private on = false;
  private announced = -1;
  constructor(private g: Game) {
    const r = REGION_BY_ID.comercio;
    const b = new Builder();
    const cx = r.x, cz = r.z;
    // zig-zag lantern strings over the whole street
    for (let k = 0; k < 9; k++) {
      const x0 = cx - 40 + k * 10, x1 = x0 + 10;
      const za = k % 2 ? -6.5 : 6.5;
      lanternString(b, x0, heightAt(x0, cz + za) + 6.2, cz + za, x1, heightAt(x1, cz - za) + 6.2, cz - za, 7);
    }
    // tall 祭 banner poles with big lanterns
    for (const dx of [-30, -10, 10, 30]) {
      for (const sz of [-6.8, 6.8]) {
        const x = cx + dx, z = cz + sz, y = heightAt(x, z);
        b.box(0.18, 5.4, 0.18, '#3a2416', { x, y: y + 2.7, z });
        b.box(0.08, 2.6, 1.0, '#efe2c8', { x: x + 0.14, y: y + 3.6, z });
        b.box(0.1, 1.2, 0.7, '#c8442f', { x: x + 0.16, y: y + 3.7, z });
        paperLantern(b, x, y + 5.6, z, '#ff9a3a', 1.1);
      }
    }
    this.group = b.build('festival', false);
    this.group.visible = false;
    g.world.scene.add(this.group);
  }

  get night() {
    const c = this.g.world.clock;
    return c > 0.75 || c < 0.22;
  }

  update() {
    const n = this.night;
    if (n !== this.on) {
      this.on = n;
      this.group.visible = n;
    }
    // announce once per night when walking onto the street
    if (n && this.g.region?.id === 'comercio') {
      const night = Math.floor((this.g.save.playTime ?? 0) / 600);
      if (this.announced !== night) {
        this.announced = night;
        sfx.furin();
        this.g.app.screens.toast('🏮 <span class="jp">夏祭り</span> Festival de verão na Rua do Comércio! O tiro ao alvo do Tio Gen paga em dobro esta noite.', 6000);
      }
    }
  }
}

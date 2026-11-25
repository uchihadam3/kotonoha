/**
 * Unified input: keyboard + mouse, touch (virtual joystick on the left, camera drag on the right, pinch
 * zoom) and gamepads. The world reads `move`, `look`, `zoom`, `run` and one-shot actions every frame.
 */
import { isTouch } from './util';

export type Action = 'interact' | 'jump' | 'back' | 'menu' | 'book' | 'map' | 'quest' | 'left' | 'right' | 'up' | 'down' | 'confirm';

export class Input {
  move = { x: 0, y: 0 };
  look = { x: 0, y: 0 };
  zoom = 0;
  run = false;
  /** world controls active (false while a menu/dialog is open) */
  enabled = true;
  readonly touch = isTouch();
  lastDevice: 'kb' | 'touch' | 'pad' = this.touch ? 'touch' : 'kb';
  private keys = new Set<string>();
  private once = new Set<Action>();
  private listeners = new Map<Action, Set<() => void>>();
  private dragging: { id: number; x: number; y: number } | null = null;
  private stick: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private pinch: { a: number; b: number; d: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private padPrev: boolean[] = [];
  sens = 1;
  invertY = false;
  stickEl: HTMLElement | null = null;
  knobEl: HTMLElement | null = null;

  constructor(private surface: HTMLElement) {
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.stick = null;
      this.dragging = null;
      this.pointers.clear();
      this.updateStickEl();
    });
    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
    surface.addEventListener('wheel', (e) => {
      this.zoom += Math.sign(e.deltaY) * 0.12;
    }, { passive: true });
    surface.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  on(a: Action, fn: () => void): () => void {
    if (!this.listeners.has(a)) this.listeners.set(a, new Set());
    this.listeners.get(a)!.add(fn);
    return () => this.listeners.get(a)!.delete(fn);
  }

  fire(a: Action) {
    this.once.add(a);
    this.listeners.get(a)?.forEach((fn) => fn());
  }

  /** consumes a one-shot action */
  take(a: Action): boolean {
    if (this.once.has(a)) {
      this.once.delete(a);
      return true;
    }
    return false;
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const k = e.code;
    if (down) {
      this.lastDevice = 'kb';
      if (!this.keys.has(k)) {
        const map: Record<string, Action> = {
          KeyE: 'interact', Enter: 'confirm', NumpadEnter: 'confirm', Space: 'jump', Escape: 'back', KeyP: 'menu', Tab: 'book', KeyB: 'book',
          KeyM: 'map', KeyJ: 'quest', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyF: 'interact',
        };
        const a = map[k];
        if (a) {
          if (k === 'Tab') e.preventDefault();
          this.fire(a);
          if (a === 'confirm') this.fire('interact');
        }
      }
      this.keys.add(k);
    } else this.keys.delete(k);
  }

  private onDown(e: PointerEvent) {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === 'touch') {
      this.lastDevice = 'touch';
      if (this.pointers.size === 2 && !this.stick) {
        const [a, b] = [...this.pointers.entries()];
        this.pinch = { a: a[0], b: b[0], d: Math.hypot(a[1].x - b[1].x, a[1].y - b[1].y) };
        this.dragging = null;
        return;
      }
      if (e.clientX < window.innerWidth * 0.42 && !this.stick && this.enabled) {
        this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
        this.updateStickEl();
        return;
      }
    } else this.lastDevice = 'kb';
    if (!this.dragging) this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  private onMove(e: PointerEvent) {
    const p = this.pointers.get(e.pointerId);
    if (p) {
      p.x = e.clientX;
      p.y = e.clientY;
    }
    if (this.pinch) {
      const a = this.pointers.get(this.pinch.a), b = this.pointers.get(this.pinch.b);
      if (a && b) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoom -= (d - this.pinch.d) * 0.006;
        this.pinch.d = d;
      }
      return;
    }
    if (this.stick && e.pointerId === this.stick.id) {
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
      this.updateStickEl();
      return;
    }
    if (this.dragging && e.pointerId === this.dragging.id) {
      const dx = e.clientX - this.dragging.x, dy = e.clientY - this.dragging.y;
      this.dragging.x = e.clientX;
      this.dragging.y = e.clientY;
      if (this.enabled) {
        const s = (e.pointerType === 'touch' ? 0.0055 : 0.0042) * this.sens;
        this.look.x += dx * s;
        this.look.y += dy * s * (this.invertY ? -1 : 1);
      }
    }
  }

  private onUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pinch && (e.pointerId === this.pinch.a || e.pointerId === this.pinch.b)) this.pinch = null;
    if (this.stick && e.pointerId === this.stick.id) {
      this.stick = null;
      this.updateStickEl();
    }
    if (this.dragging && e.pointerId === this.dragging.id) this.dragging = null;
  }

  private updateStickEl() {
    if (!this.stickEl || !this.knobEl) return;
    if (!this.stick) {
      this.stickEl.classList.remove('on');
      this.knobEl.style.transform = 'translate(-50%, -50%)';
      return;
    }
    this.stickEl.classList.add('on');
    this.stickEl.style.left = this.stick.ox + 'px';
    this.stickEl.style.top = this.stick.oy + 'px';
    const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
    const len = Math.hypot(dx, dy), max = 56;
    const k = len > max ? max / len : 1;
    this.knobEl.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  /** call once per frame before reading */
  update() {
    let mx = 0, my = 0;
    const K = this.keys;
    if (K.has('KeyW') || K.has('ArrowUp')) my += 1;
    if (K.has('KeyS') || K.has('ArrowDown')) my -= 1;
    if (K.has('KeyA') || K.has('ArrowLeft')) mx -= 1;
    if (K.has('KeyD') || K.has('ArrowRight')) mx += 1;
    let run = K.has('ShiftLeft') || K.has('ShiftRight');
    if (K.has('KeyQ')) this.look.x -= 0.03 * this.sens;
    if (K.has('KeyR')) this.look.x += 0.03 * this.sens;
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
      const len = Math.hypot(dx, dy);
      const max = 56;
      if (len > 6) {
        const m = Math.min(1, len / max);
        mx = (dx / len) * m;
        my = (-dy / len) * m;
        run = len > max * 1.25;
      }
    }
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = dz(p.axes[0] ?? 0), ly = dz(p.axes[1] ?? 0), rx = dz(p.axes[2] ?? 0), ry = dz(p.axes[3] ?? 0);
      if (lx || ly) {
        mx = lx;
        my = -ly;
        this.lastDevice = 'pad';
      }
      if (rx || ry) {
        this.look.x += rx * 0.045 * this.sens;
        this.look.y += ry * 0.03 * this.sens * (this.invertY ? -1 : 1);
      }
      const b = p.buttons.map((x) => x.pressed);
      const edge = (i: number) => b[i] && !this.padPrev[i];
      if (edge(0)) this.fire('interact'), this.fire('confirm');
      if (edge(1)) this.fire('back');
      if (edge(3)) this.fire('book');
      if (edge(2)) this.fire('jump');
      if (edge(9)) this.fire('menu');
      if (edge(8)) this.fire('map');
      if (edge(12)) this.fire('up');
      if (edge(13)) this.fire('down');
      if (edge(14)) this.fire('left');
      if (edge(15)) this.fire('right');
      if (b[10] || b[6] || b[7]) run = true;
      if (b[4]) this.zoom += 0.04;
      if (b[5]) this.zoom -= 0.04;
      if (b.some(Boolean)) this.lastDevice = 'pad';
      this.padPrev = b;
      break;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.move.x = this.enabled ? mx : 0;
    this.move.y = this.enabled ? my : 0;
    this.run = this.enabled && run;
  }

  /** read and clear accumulated camera deltas */
  consumeLook(): { x: number; y: number; zoom: number } {
    const r = { x: this.look.x, y: this.look.y, zoom: this.zoom };
    this.look.x = this.look.y = 0;
    this.zoom = 0;
    return r;
  }

  clearOnce() {
    this.once.clear();
  }
}

/**
 * Renderer + post-processing (bloom, colour grading with the "colour returns" saturation, vignette,
 * fades/flashes) + the main loop.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Quality } from './settings';
import { isTouch } from './util';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSat: { value: 1 },
    uInk: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.32 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uFlash: { value: 0 },
    uTime: { value: 0 },
    uGrain: { value: 0.025 },
    uAspect: { value: 1 },
    uBars: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uSat, uInk, uVignette, uFade, uFlash, uTime, uGrain, uAspect, uBars;
    uniform vec3 uTint, uFadeColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 0.0) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // "silence" look: cool ink wash where colour has not returned yet
      vec3 ink = mix(vec3(l), vec3(l) * vec3(0.86, 0.9, 1.04), 0.8);
      col = mix(col, ink, uInk);
      col = mix(vec3(l), col, uSat);
      col *= uTint;
      // vignette
      vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = smoothstep(0.95, 0.25, length(q) * 1.08);
      col *= mix(1.0 - uVignette, 1.0, v);
      // grain
      float g = hash(vUv * 1024.0 + fract(uTime) * 37.0) - 0.5;
      col += g * uGrain * (0.4 + l);
      col = mix(col, vec3(1.0), uFlash);
      col = mix(col, uFadeColor, uFade);
      // cinematic bars
      float bar = step(vUv.y, uBars) + step(1.0 - uBars, vUv.y);
      col = mix(col, vec3(0.0), clamp(bar, 0.0, 1.0));
      gl_FragColor = vec4(col, c.a);
    }
  `,
};

export interface FrameInfo {
  dt: number;
  t: number;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  composer!: EffectComposer;
  renderPass!: RenderPass;
  bloom!: UnrealBloomPass;
  grade!: ShaderPass;
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  quality: Exclude<Quality, 'auto'> = 'alta';
  private callbacks = new Set<(f: FrameInfo) => void>();
  private last = performance.now();
  private time = 0;
  private running = false;
  /** measured average frame time (ms) for automatic quality */
  frameMs = 16;
  pixelRatio = 1;

  constructor(parent: HTMLElement, quality: Quality) {
    this.quality = quality === 'auto' ? Engine.detectQuality() : quality;
    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality !== 'baixa', powerPreference: 'high-performance', alpha: false, stencil: false });
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'gl';
    parent.appendChild(this.canvas);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.quality !== 'baixa';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 3000);
    this.buildComposer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  static detectQuality(): Exclude<Quality, 'auto'> {
    const touch = isTouch();
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (touch && (mem <= 3 || cores <= 4)) return 'baixa';
    if (touch) return 'media';
    return 'alta';
  }

  setQuality(q: Quality) {
    this.quality = q === 'auto' ? Engine.detectQuality() : q;
    this.renderer.shadowMap.enabled = this.quality !== 'baixa';
    this.bloom.enabled = this.quality !== 'baixa';
    this.resize();
  }

  private buildComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.5, 1.0);
    this.bloom.enabled = this.quality !== 'baixa';
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  setScene(scene: THREE.Scene, camera?: THREE.PerspectiveCamera) {
    this.scene = scene;
    if (camera) this.camera = camera;
    this.renderPass.scene = scene;
    this.renderPass.camera = this.camera;
    this.resize();
  }

  get u() {
    return this.grade.uniforms as typeof GradeShader.uniforms;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const cap = this.quality === 'alta' ? 2 : this.quality === 'media' ? 1.5 : 1;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    // bloom at reduced resolution is plenty and much cheaper
    const bs = this.quality === 'alta' ? 0.5 : 0.35;
    this.bloom.setSize(Math.max(64, w * this.pixelRatio * bs), Math.max(64, h * this.pixelRatio * bs));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.u.uAspect.value = w / h;
  }

  onFrame(fn: (f: FrameInfo) => void): () => void {
    this.callbacks.add(fn);
    return () => this.callbacks.delete(fn);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      const raw = now - this.last;
      this.last = now;
      this.frameMs = this.frameMs * 0.95 + raw * 0.05;
      const dt = Math.min(0.05, raw / 1000);
      this.time += dt;
      this.u.uTime.value = this.time;
      for (const cb of this.callbacks) cb({ dt, t: this.time });
      this.composer.render(dt);
    };
    loop();
  }

  stop() {
    this.running = false;
  }
}

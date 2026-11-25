/** Sky dome with sun, moon and stars, painterly clouds, and the day/night palette that drives lighting. */
import * as THREE from 'three';
import { cloudTex } from './textures';
import { smooth } from '../core/util';

interface Key {
  t: number;
  top: string;
  hor: string;
  fog: string;
  sun: string;
  sunI: number;
  hemiS: string;
  hemiG: string;
  hemiI: number;
  night: number;
}

const KEYS: Key[] = [
  { t: 0.0, top: '#070b24', hor: '#18204a', fog: '#121836', sun: '#8da4ff', sunI: 0.35, hemiS: '#3a4c90', hemiG: '#12141f', hemiI: 0.55, night: 1 },
  { t: 0.2, top: '#121a44', hor: '#3a3566', fog: '#2a2a50', sun: '#9aa8ff', sunI: 0.3, hemiS: '#45508a', hemiG: '#181622', hemiI: 0.55, night: 0.9 },
  { t: 0.245, top: '#2d3f7e', hor: '#e0899a', fog: '#8a6a86', sun: '#ffb38a', sunI: 0.8, hemiS: '#8a86c0', hemiG: '#3a2a30', hemiI: 0.7, night: 0.4 },
  { t: 0.28, top: '#5a86d0', hor: '#ffc28e', fog: '#eac2a8', sun: '#ffd2a0', sunI: 1.7, hemiS: '#b0c4ec', hemiG: '#6a5040', hemiI: 0.85, night: 0 },
  { t: 0.36, top: '#5ea4ee', hor: '#d4ebf8', fog: '#cfe2ef', sun: '#fff1da', sunI: 2.5, hemiS: '#c4dcf6', hemiG: '#6c6a4a', hemiI: 0.95, night: 0 },
  { t: 0.5, top: '#4b93e6', hor: '#dcf0fb', fog: '#d4e6f3', sun: '#ffffff', sunI: 2.8, hemiS: '#cfe4fa', hemiG: '#6f6d4c', hemiI: 1.0, night: 0 },
  { t: 0.66, top: '#5a8edc', hor: '#f3dcc0', fog: '#ead8c6', sun: '#ffe4bc', sunI: 2.4, hemiS: '#c8d6f0', hemiG: '#6c5c44', hemiI: 0.92, night: 0 },
  { t: 0.73, top: '#3b4c98', hor: '#ff9560', fog: '#d88e72', sun: '#ff9d5c', sunI: 1.7, hemiS: '#a69ac8', hemiG: '#5a3a30', hemiI: 0.8, night: 0.05 },
  { t: 0.78, top: '#202a66', hor: '#a3507a', fog: '#5a3c66', sun: '#ff7a6a', sunI: 0.6, hemiS: '#6a5a9a', hemiG: '#2a1e2a', hemiI: 0.65, night: 0.5 },
  { t: 0.84, top: '#0c1230', hor: '#262a5a', fog: '#1a1e40', sun: '#8da4ff', sunI: 0.35, hemiS: '#3e4e92', hemiG: '#14141f', hemiI: 0.55, night: 1 },
  { t: 1.0, top: '#070b24', hor: '#18204a', fog: '#121836', sun: '#8da4ff', sunI: 0.35, hemiS: '#3a4c90', hemiG: '#12141f', hemiI: 0.55, night: 1 },
];

const ca = new THREE.Color(), cb = new THREE.Color();
function mixHex(a: string, b: string, t: number, out: THREE.Color) {
  ca.set(a);
  cb.set(b);
  return out.copy(ca).lerp(cb, t);
}

export interface SkyState {
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  fog: THREE.Color;
  horizon: THREE.Color;
  night: number;
}

export class Sky {
  readonly group = new THREE.Group();
  private mat: THREE.ShaderMaterial;
  private dome: THREE.Mesh;
  private clouds: THREE.Sprite[] = [];
  state: SkyState = {
    sunDir: new THREE.Vector3(0, 1, 0),
    sunColor: new THREE.Color(),
    sunI: 1,
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiI: 1,
    fog: new THREE.Color(),
    horizon: new THREE.Color(),
    night: 0,
  };
  /** override tint (e.g. silence regions / cutscenes): 0 = none */
  gloom = 0;

  constructor(radius = 1400, clouds = 16) {
    this.mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uHor: { value: new THREE.Color() },
        uSun: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color() },
        uNight: { value: 0 },
        uTime: { value: 0 },
        uGloom: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_Position.z = gl_Position.w; // always at the far plane
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHor, uSun, uSunCol;
        uniform float uNight, uTime, uGloom;
        varying vec3 vDir;
        float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          float t = pow(clamp(h, 0.0, 1.0), 0.55);
          vec3 col = mix(uHor, uTop, t);
          // below horizon: fade to a darker horizon (sea reflects it)
          col = mix(col, uHor * 0.85, smoothstep(0.0, -0.25, h));
          // sun
          float sd = max(dot(d, normalize(uSun)), 0.0);
          float day = 1.0 - uNight;
          col += uSunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 18.0) * 0.35 + pow(sd, 3.0) * 0.12) * day;
          // moon (opposite the sun)
          float md = max(dot(d, normalize(-uSun + vec3(0.2, 0.25, 0.0))), 0.0);
          col += vec3(0.9, 0.93, 1.0) * (smoothstep(0.99955, 0.9997, md) * 1.4 + pow(md, 60.0) * 0.12) * uNight;
          // stars
          if (uNight > 0.01 && h > 0.0) {
            vec3 q = d * 420.0;
            vec3 cell = floor(q);
            float s = hash(cell);
            vec3 f = fract(q) - 0.5;
            float core = smoothstep(0.32, 0.0, length(f));
            float tw = 0.55 + 0.45 * sin(uTime * 2.0 + s * 40.0);
            float bright = step(0.9925, s) * (0.4 + 0.6 * hash(cell + 7.0));
            float star = bright * core * tw * smoothstep(0.0, 0.25, h);
            col += vec3(star) * uNight * 1.3;
            // milky band
            float band = exp(-pow(dot(d, normalize(vec3(0.5, 0.6, -0.6))) * 3.0, 2.0));
            col += vec3(0.25, 0.28, 0.45) * band * 0.12 * uNight;
          }
          col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))) * vec3(0.8, 0.82, 0.95), uGloom);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), this.mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    this.group.add(this.dome);
    for (let i = 0; i < clouds; i++) {
      const m = new THREE.SpriteMaterial({ map: cloudTex(1 + (i % 5)), transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
      const s = new THREE.Sprite(m);
      const a = (i / clouds) * Math.PI * 2 + Math.random() * 0.3;
      const r = 500 + Math.random() * 500;
      s.position.set(Math.cos(a) * r, 140 + Math.random() * 120, Math.sin(a) * r);
      const sc = 220 + Math.random() * 260;
      s.scale.set(sc, sc * 0.42, 1);
      s.renderOrder = -9;
      this.clouds.push(s);
      this.group.add(s);
    }
  }

  /** clock 0..1 */
  update(clock: number, camPos: THREE.Vector3, t: number) {
    const c = ((clock % 1) + 1) % 1;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t <= c) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = smooth((c - a.t) / Math.max(1e-6, b.t - a.t));
    const S = this.state;
    const top = mixHex(a.top, b.top, k, new THREE.Color());
    mixHex(a.hor, b.hor, k, S.horizon);
    mixHex(a.fog, b.fog, k, S.fog);
    mixHex(a.sun, b.sun, k, S.sunColor);
    mixHex(a.hemiS, b.hemiS, k, S.hemiSky);
    mixHex(a.hemiG, b.hemiG, k, S.hemiGround);
    S.sunI = a.sunI + (b.sunI - a.sunI) * k;
    S.hemiI = a.hemiI + (b.hemiI - a.hemiI) * k;
    S.night = a.night + (b.night - a.night) * k;
    // sun path: rises in the east (+x), sets in the west, tilted to the south
    const ang = (c - 0.25) * Math.PI * 2;
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.35).normalize();
    // at night the "sun" light is the moon, from above
    if (sunDir.y < 0.08) {
      const moon = new THREE.Vector3(-Math.cos(ang) * 0.6, Math.max(0.35, -Math.sin(ang)), -0.3).normalize();
      S.sunDir.copy(sunDir).lerp(moon, smooth(Math.min(1, (0.08 - sunDir.y) / 0.16))).normalize();
    } else S.sunDir.copy(sunDir);
    const u = this.mat.uniforms;
    u.uTop.value.copy(top);
    u.uHor.value.copy(S.horizon);
    u.uSun.value.copy(sunDir);
    u.uSunCol.value.copy(S.sunColor);
    u.uNight.value = S.night;
    u.uTime.value = t;
    u.uGloom.value = this.gloom;
    this.group.position.set(camPos.x, 0, camPos.z);
    // clouds: tinted by the horizon and sun, drifting slowly
    const cl = new THREE.Color().copy(S.horizon).lerp(new THREE.Color('#ffffff'), 0.55 * (1 - S.night));
    cl.lerp(S.sunColor, 0.15);
    for (let j = 0; j < this.clouds.length; j++) {
      const s = this.clouds[j];
      const m = s.material as THREE.SpriteMaterial;
      m.color.copy(cl).multiplyScalar(0.55 + 0.45 * (1 - S.night));
      m.opacity = 0.75 - S.night * 0.45;
      const a = (j / this.clouds.length) * Math.PI * 2 + t * 0.004 + j;
      const r = 520 + (j % 4) * 140;
      s.position.x = Math.cos(a) * r;
      s.position.z = Math.sin(a) * r;
    }
  }
}

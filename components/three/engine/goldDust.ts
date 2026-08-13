import { BufferGeometry, Float32BufferAttribute, NormalBlending, Points, ShaderMaterial } from "three"
import { GOLD } from "./theme"

const DUST_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uSpread;

attribute float aSeed;
attribute float aScale;

varying float vAlpha;

void main() {
  float phase = aSeed * 6.28318530718;
  float sway = sin(uTime * (0.14 + aSeed * 0.10) + phase);
  float drift = cos(uTime * (0.11 + aSeed * 0.08) + phase * 1.7);

  vec3 pos = position;
  pos.x += sway * 0.35;
  pos.z += drift * 0.35;

  // A slow upward rise that wraps at the top back to the bottom, so the
  // field stays populated forever with zero per-frame CPU bookkeeping: the
  // GPU derives every particle's position from uTime alone.
  pos.y = mod(position.y + uTime * (0.11 + aSeed * 0.07) + uSpread, uSpread * 2.0) - uSpread;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depthFade = clamp(1.0 - (-mvPosition.z) / 9.0, 0.18, 1.0);
  vAlpha = depthFade * (0.5 + 0.5 * aScale);

  gl_PointSize = uSize * aScale * uPixelRatio * (5.0 / -mvPosition.z);
}
`

const DUST_FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec3 uColorCore;
uniform vec3 uColorHi;
uniform float uOpacity;

varying float vAlpha;

void main() {
  // The "sprite" is drawn here, procedurally, from gl_PointCoord: no
  // texture download for a soft round mote.
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float falloff = smoothstep(0.5, 0.0, d);

  vec3 color = mix(uColorCore, uColorHi, 0.35);
  gl_FragColor = vec4(color, falloff * vAlpha * uOpacity);
}
`

export interface GoldDustOptions {
  /** Particle count. Default 240: a light sprinkling, not a storm. */
  count?: number
  /** Half-extent of the field on X/Z. */
  spreadXZ?: number
  /** Half-height of the vertical wrap band on Y. */
  spreadY?: number
  opacity?: number
}

export interface GoldDustHandle {
  points: Points
  update(elapsed: number): void
  setOpacity(v: number): void
  setPixelRatio(v: number): void
  dispose(): void
}

/**
 * Fine gold motes drifting behind the hero type. A single THREE.Points draw
 * call for every particle (the cheapest primitive three.js has); all motion
 * is computed in the vertex shader from `uTime` and a per-particle random
 * seed baked into an attribute at creation, so the CPU cost per frame is one
 * uniform upload regardless of particle count.
 */
export function createGoldDust(opts: GoldDustOptions = {}): GoldDustHandle {
  const count = opts.count ?? 240
  const spreadXZ = opts.spreadXZ ?? 4.2
  const spreadY = opts.spreadY ?? 2.4
  const opacity = opts.opacity ?? 0.95

  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const scales = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() * 2 - 1) * spreadXZ
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * spreadY
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * spreadXZ * 0.6 - 1.2
    seeds[i] = Math.random()
    scales[i] = 0.35 + Math.random() * 0.65
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1))
  geometry.setAttribute("aScale", new Float32BufferAttribute(scales, 1))

  const material = new ShaderMaterial({
    vertexShader: DUST_VERTEX,
    fragmentShader: DUST_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 34 },
      uSpread: { value: spreadY },
      uColorCore: { value: GOLD.core },
      uColorHi: { value: GOLD.highlight },
      uOpacity: { value: opacity },
    },
  })

  const points = new Points(geometry, material)
  // The wrap-around rise can carry particles outside a naively computed
  // bounding sphere; at 240 points, skipping the cull test is free.
  points.frustumCulled = false

  function update(elapsed: number) {
    material.uniforms.uTime.value = elapsed
  }
  function setOpacity(v: number) {
    material.uniforms.uOpacity.value = v
  }
  function setPixelRatio(v: number) {
    material.uniforms.uPixelRatio.value = v
  }
  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { points, update, setOpacity, setPixelRatio, dispose }
}

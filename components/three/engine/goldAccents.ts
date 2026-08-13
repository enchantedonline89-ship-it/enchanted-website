import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry,
} from "three"
import { GOLD, GOLD_HEX } from "./theme"

const SILK_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SILK_FRAGMENT = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float travelling = fract(vUv.y + uTime * 0.055 + sin(vUv.x * 4.2) * 0.08);
  float band = smoothstep(0.0, 0.18, travelling) * (1.0 - smoothstep(0.18, 0.52, travelling));
  float edge = sin(vUv.x * 3.14159265);
  gl_FragColor = vec4(${((GOLD_HEX.highlight >> 16) & 255) / 255}, ${((GOLD_HEX.highlight >> 8) & 255) / 255}, ${(GOLD_HEX.highlight & 255) / 255}, band * edge * uOpacity);
}
`

export interface GoldAccentsHandle {
  ring: Mesh
  silk: Mesh
  layout(aspect: number, viewHeight: number): void
  update(elapsed: number): void
  setIntensity(value: number): void
  dispose(): void
}

/** Two deliberately light ambient accents: one torus and one shader plane. */
export function createGoldAccents(): GoldAccentsHandle {
  const ringGeometry = new TorusGeometry(1, 0.018, 8, 72)
  const ringMaterial = new MeshBasicMaterial({
    color: GOLD.core,
    transparent: true,
    opacity: 0.18,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  const ring = new Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = 0.12
  ring.rotation.y = -0.18

  const silkGeometry = new PlaneGeometry(1, 1)
  const silkMaterial = new ShaderMaterial({
    vertexShader: SILK_VERTEX,
    fragmentShader: SILK_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.08 },
    },
  })
  const silk = new Mesh(silkGeometry, silkMaterial)
  silk.position.z = -0.5
  silk.rotation.z = -0.24

  return {
    ring,
    silk,
    layout(aspect, viewHeight) {
      const viewWidth = viewHeight * aspect
      const compact = aspect < 0.8
      const ringRadius = compact ? Math.min(viewWidth * 0.36, 0.95) : Math.min(viewHeight * 0.34, 1.75)
      ring.scale.setScalar(ringRadius)
      ring.position.set(compact ? viewWidth * 0.12 : viewWidth * 0.28, compact ? -viewHeight * 0.19 : 0, 0)
      silk.scale.set(viewWidth * 1.35, viewHeight * 1.45, 1)
    },
    update(elapsed) {
      ring.rotation.z = elapsed * 0.035
      ring.rotation.y = -0.18 + Math.sin(elapsed * 0.12) * 0.08
      silkMaterial.uniforms.uTime.value = elapsed
    },
    setIntensity(value) {
      ringMaterial.opacity = 0.18 * value
      silkMaterial.uniforms.uOpacity.value = 0.08 * value
    },
    dispose() {
      ringGeometry.dispose()
      ringMaterial.dispose()
      silkGeometry.dispose()
      silkMaterial.dispose()
    },
  }
}

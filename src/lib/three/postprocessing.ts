// src/lib/three/postprocessing.ts
import * as THREE from 'three-platformize'
import { EffectComposer } from 'three-platformize/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three-platformize/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three-platformize/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three-platformize/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FXAAShader } from 'three-platformize/examples/jsm/shaders/FXAAShader.js'

export interface PostProcessing {
  composer: EffectComposer
  fxaaPass: ShaderPass
  bloomPass: UnrealBloomPass
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): PostProcessing {
  const composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const fxaaPass = new ShaderPass(FXAAShader)
  const pixelRatio = renderer.getPixelRatio()
  const canvas = renderer.domElement
  const width = canvas.width || 375
  const height = canvas.height || 400
  fxaaPass.material.uniforms['resolution'].value.set(
    1 / (width * pixelRatio),
    1 / (height * pixelRatio)
  )
  composer.addPass(fxaaPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.5,
    0.4,
    0.85
  )
  composer.addPass(bloomPass)

  return { composer, fxaaPass, bloomPass }
}

export function renderWithPostProcessing(postProcessing: PostProcessing): void {
  postProcessing.composer.render()
}

export function disposePostProcessing(postProcessing: PostProcessing): void {
  // Dispose passes in reverse order
  postProcessing.bloomPass.dispose()
  // Note: ShaderPass and EffectComposer don't have dispose methods in three-platformize
  // The passes will be garbage collected
}

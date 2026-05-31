import * as THREE from 'three'
import { createLights } from './lighting'

export interface DiceScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  lights: ReturnType<typeof createLights>
  ground: THREE.Mesh
}

export function createDiceScene(
  canvas: HTMLCanvasElement | Record<string, any>,
  width: number,
  height: number
): DiceScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xF5F5F0)

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(0, 5, 8)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as any,
    antialias: true,
    alpha: false,
  })
  renderer.setSize(width, height)
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1
  renderer.setPixelRatio(Math.min(pixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const lights = createLights()
  scene.add(lights.directional, lights.ambient, lights.point)

  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xE8E8E0,
    roughness: 0.8,
    metalness: 0.0,
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  scene.add(ground)

  return { scene, camera, renderer, lights, ground }
}

export function renderScene(diceScene: DiceScene): void {
  diceScene.renderer.render(diceScene.scene, diceScene.camera)
}

export function disposeScene(diceScene: DiceScene): void {
  diceScene.renderer.dispose()
  diceScene.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}

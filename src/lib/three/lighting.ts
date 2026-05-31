import * as THREE from 'three'

export function createLights(): {
  directional: THREE.DirectionalLight
  ambient: THREE.AmbientLight
  point: THREE.PointLight
} {
  const directional = new THREE.DirectionalLight(0xffffff, 1.0)
  directional.position.set(5, 10, 5)
  directional.castShadow = true
  directional.shadow.mapSize.width = 1024
  directional.shadow.mapSize.height = 1024
  directional.shadow.camera.near = 0.5
  directional.shadow.camera.far = 50

  const ambient = new THREE.AmbientLight(0xffffff, 0.4)

  const point = new THREE.PointLight(0xF59E0B, 0.5, 10)

  return { directional, ambient, point }
}

import * as CANNON from 'cannon-es'
import { physicsWorld } from './world'

export function createTablePlane(): CANNON.Body {
  const shape = new CANNON.Plane()
  const body = new CANNON.Body({
    mass: 0, // 静态刚体
    material: physicsWorld.materials.table,
  })
  body.addShape(shape)
  // 旋转使平面向上
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  body.position.set(0, 0, 0)

  physicsWorld.world.addBody(body)
  return body
}

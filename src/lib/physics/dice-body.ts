import * as CANNON from 'cannon-es'
import { physicsWorld } from './world'

const DICE_SIZE = 1.0 // 骰子边长 1米

export function createD6Body(): CANNON.Body {
  const shape = new CANNON.Box(new CANNON.Vec3(DICE_SIZE / 2, DICE_SIZE / 2, DICE_SIZE / 2))
  const body = new CANNON.Body({
    mass: 1, // 1kg
    material: physicsWorld.materials.dice,
  })
  body.addShape(shape)

  // 启用休眠
  body.allowSleep = true
  body.sleepSpeedLimit = 0.05
  body.sleepTimeLimit = 0.5

  return body
}

// 应用随机初始力和旋转
export function applyThrowForce(body: CANNON.Body) {
  // 随机初始位置（空中）
  body.position.set(
    (Math.random() - 0.5) * 1.5,
    2 + Math.random() * 2, // 2-4米高度
    (Math.random() - 0.5) * 1.5
  )

  // 随机初始旋转
  body.quaternion.setFromEuler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )

  // 施加随机冲量（模拟投掷力）
  body.applyImpulse(
    new CANNON.Vec3(
      (Math.random() - 0.5) * 3,
      Math.random() * 2 + 1, // 向上的力
      (Math.random() - 0.5) * 3
    ),
    body.position
  )

  // 施加随机角速度（模拟旋转）
  body.angularVelocity.set(
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20
  )
}

import * as CANNON from 'cannon-es'
import { physicsWorld } from './world'

// 边界范围（米）
const BOUNDARY_SIZE = 4

export function createTablePlane(): CANNON.Body {
  // 创建桌面
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

  // 创建四面围墙防止骰子滚出屏幕
  const wallShape = new CANNON.Plane()
  const wallMaterial = physicsWorld.materials.wall

  // 前墙 (z = +BOUNDARY_SIZE)
  const frontWall = new CANNON.Body({ mass: 0, material: wallMaterial })
  frontWall.addShape(wallShape)
  frontWall.position.set(0, 0, -BOUNDARY_SIZE)
  frontWall.quaternion.setFromEuler(0, Math.PI, 0)
  physicsWorld.world.addBody(frontWall)

  // 后墙 (z = -BOUNDARY_SIZE)
  const backWall = new CANNON.Body({ mass: 0, material: wallMaterial })
  backWall.addShape(wallShape)
  backWall.position.set(0, 0, BOUNDARY_SIZE)
  physicsWorld.world.addBody(backWall)

  // 左墙 (x = -BOUNDARY_SIZE)
  const leftWall = new CANNON.Body({ mass: 0, material: wallMaterial })
  leftWall.addShape(wallShape)
  leftWall.position.set(-BOUNDARY_SIZE, 0, 0)
  leftWall.quaternion.setFromEuler(0, Math.PI / 2, 0)
  physicsWorld.world.addBody(leftWall)

  // 右墙 (x = +BOUNDARY_SIZE)
  const rightWall = new CANNON.Body({ mass: 0, material: wallMaterial })
  rightWall.addShape(wallShape)
  rightWall.position.set(BOUNDARY_SIZE, 0, 0)
  rightWall.quaternion.setFromEuler(0, -Math.PI / 2, 0)
  physicsWorld.world.addBody(rightWall)

  return body
}

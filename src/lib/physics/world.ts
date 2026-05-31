import * as CANNON from 'cannon-es'

class PhysicsWorld {
  private static instance: PhysicsWorld
  public world: CANNON.World
  public materials: {
    dice: CANNON.Material
    table: CANNON.Material
    wall: CANNON.Material
  }

  private constructor() {
    this.world = new CANNON.World()
    this.world.gravity.set(0, -9.82, 0) // 标准重力
    this.world.broadphase = new CANNON.NaiveBroadphase()
    ;(this.world.solver as CANNON.GSSolver).iterations = 15 // 提高精度

    // 启用休眠机制优化性能
    this.world.allowSleep = true

    this.materials = this.createMaterials()
  }

  static getInstance(): PhysicsWorld {
    if (!PhysicsWorld.instance) {
      PhysicsWorld.instance = new PhysicsWorld()
    }
    return PhysicsWorld.instance
  }

  private createMaterials() {
    const diceMaterial = new CANNON.Material('dice')
    const tableMaterial = new CANNON.Material('table')
    const wallMaterial = new CANNON.Material('wall')

    // 定义接触材质
    const diceTableContact = new CANNON.ContactMaterial(
      diceMaterial,
      tableMaterial,
      {
        friction: 0.6, // 较高摩擦
        restitution: 0.2, // 低弹性，快速停下
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
      }
    )

    // 骰子之间的接触
    const diceDiceContact = new CANNON.ContactMaterial(
      diceMaterial,
      diceMaterial,
      {
        friction: 0.3,
        restitution: 0.5,
      }
    )

    // 骰子与墙壁的接触（低弹性，让骰子快速停下）
    const diceWallContact = new CANNON.ContactMaterial(
      diceMaterial,
      wallMaterial,
      {
        friction: 0.8, // 高摩擦
        restitution: 0.1, // 低弹性，几乎不反弹
      }
    )

    this.world.addContactMaterial(diceTableContact)
    this.world.addContactMaterial(diceDiceContact)
    this.world.addContactMaterial(diceWallContact)

    return { dice: diceMaterial, table: tableMaterial, wall: wallMaterial }
  }

  step(deltaTime: number) {
    // 固定时间步长，最大3个子步骤
    this.world.step(1 / 60, deltaTime, 3)
  }

  clear() {
    // 移除所有动态刚体
    this.world.bodies.forEach((body) => {
      if (body.type === CANNON.Body.DYNAMIC) {
        this.world.removeBody(body)
      }
    })
  }
}

export const physicsWorld = PhysicsWorld.getInstance()

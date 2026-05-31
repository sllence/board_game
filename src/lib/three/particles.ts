import * as THREE from 'three'

// 粒子系统配置
interface ParticleConfig {
  count: number
  size: number
  color: THREE.Color
  lifetime: number
  speed?: number
  gravity?: boolean
}

// 基础粒子类
class Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: THREE.Color

  constructor(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    config: ParticleConfig
  ) {
    this.position = position.clone()
    this.velocity = velocity.clone()
    this.life = config.lifetime
    this.maxLife = config.lifetime
    this.size = config.size
    this.color = config.color.clone()
  }

  update(deltaTime: number, gravity: boolean = false): boolean {
    this.life -= deltaTime
    if (this.life <= 0) return false

    if (gravity) {
      this.velocity.y -= 9.82 * deltaTime
    }

    this.position.add(this.velocity.clone().multiplyScalar(deltaTime))
    return true
  }

  getAlpha(): number {
    return Math.max(0, this.life / this.maxLife)
  }
}

// 投掷轨迹粒子系统
export class TrailParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private config: ParticleConfig = {
    count: 8,
    size: 0.03,
    color: new THREE.Color(0xFFD700),
    lifetime: 0.8,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
  }

  emit(position: THREE.Vector3): void {
    for (let i = 0; i < this.config.count; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      )
      this.particles.push(new Particle(position, velocity, this.config))
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter((p) => p.update(deltaTime))
    this.updateGeometry()
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3)
    const alphas = new Float32Array(this.particles.length)

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      alphas[i] = p.getAlpha()
    })

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

// 落地火花粒子系统
export class SparkParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private config: ParticleConfig = {
    count: 25,
    size: 0.02,
    color: new THREE.Color(0xFF4500),
    lifetime: 0.4,
    speed: 3,
    gravity: true,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)
  }

  emit(position: THREE.Vector3): void {
    for (let i = 0; i < this.config.count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.5 // 上半球
      const speed = this.config.speed! * (0.5 + Math.random() * 0.5)

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      )

      this.particles.push(new Particle(position, velocity, this.config))
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter((p) => p.update(deltaTime, true))
    this.updateGeometry()
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3)
    const alphas = new Float32Array(this.particles.length)

    this.particles.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      alphas[i] = p.getAlpha()
    })

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

// 结果光效粒子系统
export class GlowParticleSystem {
  private sprites: THREE.Sprite[] = []
  private material: THREE.SpriteMaterial
  private config = {
    size: 0.5,
    maxSize: 1.0,
    color: new THREE.Color(0xFFD700),
    duration: 1.5,
  }

  constructor() {
    this.material = new THREE.SpriteMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }

  show(position: THREE.Vector3): void {
    const sprite = new THREE.Sprite(this.material.clone())
    sprite.position.copy(position)
    sprite.position.y += 0.5
    sprite.scale.setScalar(this.config.size)
    this.sprites.push(sprite)
  }

  update(_deltaTime: number): void {
    this.sprites.forEach((sprite) => {
      const material = sprite.material as THREE.SpriteMaterial
      const progress = 1 - (material.opacity / 0.7)

      if (progress < 0.5) {
        // 淡入
        material.opacity = progress * 1.4
        const scale = this.config.size + (this.config.maxSize - this.config.size) * progress * 2
        sprite.scale.setScalar(scale)
      } else {
        // 淡出
        material.opacity = (1 - progress) * 1.4
      }
    })
  }

  getSprites(): THREE.Sprite[] {
    return this.sprites
  }

  dispose(): void {
    this.material.dispose()
    this.sprites.forEach((s) => s.material.dispose())
  }
}

// 环境微光粒子系统
export class AmbientParticleSystem {
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private time: number = 0
  private config = {
    count: 80,
    size: 0.02,
    color: new THREE.Color(0xFFFFCC),
    lifetime: Infinity,
  }

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      color: this.config.color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geometry, this.material)

    // 初始化粒子位置
    this.initParticles()
  }

  private initParticles(): void {
    const positions = new Float32Array(this.config.count * 3)

    for (let i = 0; i < this.config.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = Math.random() * 3 + 0.5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10

      this.particles.push(
        new Particle(
          new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
          new THREE.Vector3(0, 0, 0),
          { ...this.config, lifetime: Infinity }
        )
      )
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }

  update(deltaTime: number): void {
    this.time += deltaTime

    const positions = this.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < this.config.count; i++) {
      const y = positions.getY(i)
      positions.setY(i, y + Math.sin(this.time + i) * 0.001)
      positions.setX(i, positions.getX(i) + Math.cos(this.time * 0.5 + i) * 0.0005)
    }
    positions.needsUpdate = true
  }

  getPoints(): THREE.Points {
    return this.points
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

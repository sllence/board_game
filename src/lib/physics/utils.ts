import * as CANNON from 'cannon-es'

// D6 面法向量定义（局部坐标系）
export const D6_FACE_NORMALS = [
  new CANNON.Vec3(0, 0, 1), // 正面 (1)
  new CANNON.Vec3(0, 1, 0), // 顶面 (2)
  new CANNON.Vec3(1, 0, 0), // 右面 (3)
  new CANNON.Vec3(-1, 0, 0), // 左面 (4)
  new CANNON.Vec3(0, -1, 0), // 底面 (5)
  new CANNON.Vec3(0, 0, -1), // 背面 (6)
]

// 检测D6朝上的面
export function getTopFaceD6(body: CANNON.Body): number {
  const up = new CANNON.Vec3(0, 1, 0) // 世界坐标系向上方向

  let maxDot = -Infinity
  let topFaceIndex = 0

  for (let i = 0; i < D6_FACE_NORMALS.length; i++) {
    // 将局部法向量转换到世界坐标系
    const worldNormal = body.quaternion.vmult(D6_FACE_NORMALS[i])
    const dot = worldNormal.dot(up)

    if (dot > maxDot) {
      maxDot = dot
      topFaceIndex = i
    }
  }

  return topFaceIndex + 1 // 面索引 + 1 = 点数
}

// 透视投影：3D -> 2D
export function project3DTo2D(
  point: CANNON.Vec3,
  cameraPos: CANNON.Vec3,
  focalLength: number,
  canvasSize: { width: number; height: number }
): { x: number; y: number } {
  const dx = point.x - cameraPos.x
  const dy = point.y - cameraPos.y
  const dz = point.z - cameraPos.z

  const scale = focalLength / (focalLength + dz)
  const x = dx * scale + canvasSize.width / 2
  const y = -dy * scale + canvasSize.height / 2 // Y轴翻转

  return { x, y }
}

// 检查骰子是否停止
export function isDiceStopped(body: CANNON.Body): boolean {
  const velocityThreshold = 0.1 // m/s
  const angularThreshold = 0.2 // rad/s

  const linearSpeed = body.velocity.length()
  const angularSpeed = body.angularVelocity.length()

  return linearSpeed < velocityThreshold && angularSpeed < angularThreshold
}

// 获取立方体8个顶点的世界坐标
export function getCubeVertices(
  position: CANNON.Vec3,
  quaternion: CANNON.Quaternion,
  size: number
): CANNON.Vec3[] {
  const half = size / 2
  const localVertices = [
    new CANNON.Vec3(-half, -half, -half),
    new CANNON.Vec3(half, -half, -half),
    new CANNON.Vec3(half, half, -half),
    new CANNON.Vec3(-half, half, -half),
    new CANNON.Vec3(-half, -half, half),
    new CANNON.Vec3(half, -half, half),
    new CANNON.Vec3(half, half, half),
    new CANNON.Vec3(-half, half, half),
  ]

  return localVertices.map((v) => {
    const rotated = quaternion.vmult(v)
    return new CANNON.Vec3(position.x + rotated.x, position.y + rotated.y, position.z + rotated.z)
  })
}

// 通用面检测：对任意骰子类型检测朝上的面
export function getTopFace(faceNormals: CANNON.Vec3[], body: CANNON.Body): number {
  const up = new CANNON.Vec3(0, 1, 0)
  let maxDot = -Infinity
  let topIndex = 0

  for (let i = 0; i < faceNormals.length; i++) {
    const worldNormal = body.quaternion.vmult(faceNormals[i])
    const dot = worldNormal.dot(up)
    if (dot > maxDot) {
      maxDot = dot
      topIndex = i
    }
  }

  return topIndex
}

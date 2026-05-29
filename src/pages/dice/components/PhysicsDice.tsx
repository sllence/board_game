import { View, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { FC, useEffect, useRef, useCallback } from 'react'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import { createD6Body, applyThrowForce } from '@/lib/physics/dice-body'
import { createTablePlane } from '@/lib/physics/table-plane'
import { getTopFaceD6, project3DTo2D, isDiceStopped, getCubeVertices } from '@/lib/physics/utils'

interface PhysicsDiceProps {
  count: number
  onResult: (results: number[]) => void
  onAnimationStart: () => void
  onAnimationEnd: () => void
}

export const PhysicsDice: FC<PhysicsDiceProps> = ({ count, onResult, onAnimationStart, onAnimationEnd }) => {
  const canvasRef = useRef<any>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const bodiesRef = useRef<CANNON.Body[]>([])
  const animatingRef = useRef(false)
  const stopCounterRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tableCreatedRef = useRef(false)

  // 摄像机参数
  const cameraPos = new CANNON.Vec3(0, 5, 8)
  const focalLength = 400

  // 清理函数
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
    }

    // 清除物理世界中的骰子
    bodiesRef.current.forEach((body) => {
      physicsWorld.world.removeBody(body)
    })
    bodiesRef.current = []
  }, [])

  // 初始化 Canvas
  useReady(() => {
    const query = Taro.createSelectorQuery()
    query
      .select('#diceCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]?.node) {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio

          canvas.width = 375 * dpr
          canvas.height = 400 * dpr
          ctx.scale(dpr, dpr)

          canvasRef.current = canvas
          ctxRef.current = ctx

          // 创建桌面（只创建一次）
          if (!tableCreatedRef.current) {
            createTablePlane()
            tableCreatedRef.current = true
          }
        }
      })

    return () => cleanup()
  })

  // 投掷骰子
  const throwDice = useCallback(() => {
    cleanup()
    animatingRef.current = true
    stopCounterRef.current = 0
    onAnimationStart()

    // 创建骰子刚体
    for (let i = 0; i < count; i++) {
      const body = createD6Body()
      applyThrowForce(body)
      physicsWorld.world.addBody(body)
      bodiesRef.current.push(body)
    }

    // 启动渲染循环
    startRenderLoop()
  }, [count, cleanup, onAnimationStart])

  // 暴露投掷方法给父组件
  useEffect(() => {
    ;(window as any).__throwDice = throwDice
  }, [throwDice])

  // 渲染循环
  const startRenderLoop = useCallback(() => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

    const render = () => {
      if (!animatingRef.current || !ctxRef.current || !canvasRef.current) return

      const ctx = ctxRef.current
      const width = 375
      const height = 400

      // 更新物理世界
      physicsWorld.step(1 / 60)

      // 清空画布
      ctx.clearRect(0, 0, width, height)

      // 绘制背景
      drawBackground(ctx, width, height)

      // 收集骰子数据并按深度排序
      const diceData = bodiesRef.current.map((body) => ({
        body,
        vertices: getCubeVertices(body.position, body.quaternion, 1.0),
        depth: body.position.y, // 使用Y坐标作为深度
      }))

      // 远的先画（画家算法）
      diceData.sort((a, b) => b.depth - a.depth)

      // 绘制每个骰子
      diceData.forEach(({ body, vertices }) => {
        drawD6Dice(ctx, body, vertices, cameraPos, focalLength, { width, height })
      })

      // 检查是否所有骰子都停止
      if (bodiesRef.current.length > 0 && bodiesRef.current.every(isDiceStopped)) {
        stopCounterRef.current++

        // 连续30帧（约0.5秒）都停止才判定为结束
        if (stopCounterRef.current >= 30) {
          const results = bodiesRef.current.map(getTopFaceD6)
          onResult(results)
          animatingRef.current = false
          onAnimationEnd()
          return
        }
      } else {
        stopCounterRef.current = 0
      }

      // 继续下一帧
      if (isWeapp) {
        intervalRef.current = setTimeout(render, 1000 / 60)
      } else {
        animationFrameRef.current = requestAnimationFrame(render)
      }
    }

    render()
  }, [onResult, onAnimationEnd])

  return (
    <View className="w-full h-[400px]">
      <Canvas id="diceCanvas" type="2d" className="w-full h-full" />
    </View>
  )
}

// 绘制背景
function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // 渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#F5F5F0')
  gradient.addColorStop(1, '#E8E8E0')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // 桌面纹理
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, height)
    ctx.stroke()
  }
}

// 绘制D6骰子
function drawD6Dice(
  ctx: CanvasRenderingContext2D,
  body: CANNON.Body,
  vertices: CANNON.Vec3[],
  cameraPos: CANNON.Vec3,
  focalLength: number,
  canvasSize: { width: number; height: number }
) {
  // D6的6个面（顶点索引）
  const faces = [
    { indices: [0, 1, 2, 3], value: 6 }, // 背面
    { indices: [4, 5, 6, 7], value: 1 }, // 正面
    { indices: [3, 2, 6, 7], value: 2 }, // 顶面
    { indices: [0, 1, 5, 4], value: 5 }, // 底面
    { indices: [1, 2, 6, 5], value: 3 }, // 右面
    { indices: [0, 3, 7, 4], value: 4 }, // 左面
  ]

  // 面的颜色
  const faceColors = ['#FFFFFF', '#FAFAFA', '#F5F5F5', '#F0F0F0', '#EBEBEB', '#E5E5E5']

  // 光源方向
  const lightDir = normalize([0.5, 1, 0.5])

  // 按可见性和亮度排序
  const visibleFaces = faces
    .map((face, index) => {
      const faceVertices = face.indices.map((i) => vertices[i])
      const normal = calculateFaceNormal(faceVertices)

      // 背面剔除
      const viewDir = normalize([
        cameraPos.x - body.position.x,
        cameraPos.y - body.position.y,
        cameraPos.z - body.position.z,
      ])

      const dot = normal[0] * viewDir[0] + normal[1] * viewDir[1] + normal[2] * viewDir[2]

      if (dot <= 0) return null // 背面不可见

      // 计算亮度
      const brightness = Math.max(
        0.3,
        normal[0] * lightDir[0] + normal[1] * lightDir[1] + normal[2] * lightDir[2]
      )

      return { face, normal, brightness, color: faceColors[index] }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.brightness - a.brightness) // 暗的先画

  // 绘制面
  visibleFaces.forEach(({ face, brightness, color }) => {
    const projectedVertices = face.indices.map((i) =>
      project3DTo2D(vertices[i], cameraPos, focalLength, canvasSize)
    )

    // 调整颜色亮度
    const adjustedColor = adjustBrightness(color, brightness)

    ctx.fillStyle = adjustedColor
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(projectedVertices[0].x, projectedVertices[0].y)
    for (let i = 1; i < projectedVertices.length; i++) {
      ctx.lineTo(projectedVertices[i].x, projectedVertices[i].y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 绘制点
    drawD6Dots(ctx, face.value, projectedVertices)
  })
}

// 辅助函数：归一化向量
function normalize(vec: number[]): number[] {
  const length = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
  return vec.map((v) => v / length)
}

// 辅助函数：计算面法向量
function calculateFaceNormal(vertices: CANNON.Vec3[]): number[] {
  const v0 = vertices[0]
  const v1 = vertices[1]
  const v2 = vertices[2]

  const edge1 = [v1.x - v0.x, v1.y - v0.y, v1.z - v0.z]
  const edge2 = [v2.x - v0.x, v2.y - v0.y, v2.z - v0.z]

  const normal = [
    edge1[1] * edge2[2] - edge1[2] * edge2[1],
    edge1[2] * edge2[0] - edge1[0] * edge2[2],
    edge1[0] * edge2[1] - edge1[1] * edge2[0],
  ]

  return normalize(normal)
}

// 辅助函数：调整颜色亮度
function adjustBrightness(color: string, brightness: number): string {
  // 简化实现：根据亮度调整颜色
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const adjustedR = Math.floor(r * brightness)
  const adjustedG = Math.floor(g * brightness)
  const adjustedB = Math.floor(b * brightness)

  return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`
}

// 绘制D6的点
function drawD6Dots(
  ctx: CanvasRenderingContext2D,
  value: number,
  vertices: { x: number; y: number }[]
) {
  // D6点位配置（复用现有逻辑）
  const D6_DOTS: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  }

  const dots = D6_DOTS[value] || []

  // 计算面的中心点和大小
  const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
  const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length

  // 估算面的大小
  const width = Math.max(...vertices.map((v) => v.x)) - Math.min(...vertices.map((v) => v.x))
  const height = Math.max(...vertices.map((v) => v.y)) - Math.min(...vertices.map((v) => v.y))

  ctx.fillStyle = '#1A1A1A'

  dots.forEach(([px, py]) => {
    const x = centerX + ((px - 50) / 100) * width
    const y = centerY + ((py - 50) / 100) * height
    const radius = Math.min(width, height) * 0.08

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

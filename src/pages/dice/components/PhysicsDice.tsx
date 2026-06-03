import { View, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useRef, useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three-platformize'
import * as CANNON from 'cannon-es'
import { physicsWorld } from '@/lib/physics/world'
import { createD6Body, applyThrowForce } from '@/lib/physics/dice-body'
import { createTablePlane } from '@/lib/physics/table-plane'
import { getTopFaceD6, isDiceStopped } from '@/lib/physics/utils'
import { createDiceScene, renderScene, DiceScene } from '@/lib/three/scene'
import { createD6Dice, updateDiceTransform, disposeD6Dice, DiceColor, DiceTheme } from '@/lib/three/dice'
import {
  createPostProcessing,
  disposePostProcessing,
  renderWithPostProcessing,
  PostProcessing,
} from '@/lib/three/postprocessing'
import { PerformanceMonitor, getEffectsConfig } from '@/lib/three/performance'

const STOP_FRAME_THRESHOLD = 30
const MAX_ANIMATION_TIME = 5000

interface PhysicsDiceProps {
  count: number
  color: DiceColor
  theme: DiceTheme
  onResult: (results: number[]) => void
  onAnimationStart: () => void
  onAnimationEnd: () => void
}

export interface PhysicsDiceHandle {
  throwDice: () => void
}

export const PhysicsDice = forwardRef<PhysicsDiceHandle, PhysicsDiceProps>(
  ({ count, color, theme, onResult, onAnimationStart, onAnimationEnd }, ref) => {
  const diceSceneRef = useRef<DiceScene | null>(null)
  const postProcessingRef = useRef<PostProcessing | null>(null)
  const diceRef = useRef<THREE.Mesh[]>([])
  const bodiesRef = useRef<CANNON.Body[]>([])
  const animatingRef = useRef(false)
  const stopCounterRef = useRef(0)
  const startTimeRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasReadyRef = useRef(false)
  const performanceRef = useRef<PerformanceMonitor | null>(null)
  const tablePlaneBodyRef = useRef<CANNON.Body | null>(null)
  const resultsReportedRef = useRef(false)
  const lastFrameTimeRef = useRef(Date.now())

  const canvasNodeRef = useRef<any>(null)
  const resizeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef = useRef<typeof requestAnimationFrame | null>(null)

  const onResultRef = useRef(onResult)
  const onAnimationEndRef = useRef(onAnimationEnd)
  onResultRef.current = onResult
  onAnimationEndRef.current = onAnimationEnd

  const cleanupBodies = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }

    bodiesRef.current.forEach((body) => {
      physicsWorld.world.removeBody(body)
    })
    bodiesRef.current = []

    diceRef.current.forEach((dice) => {
      if (diceSceneRef.current) {
        diceSceneRef.current.scene.remove(dice)
      }
      disposeD6Dice(dice)
    })
    diceRef.current = []
  }, [])

  const cleanup = useCallback(() => {
    cleanupBodies()

    performanceRef.current?.dispose()
    if (postProcessingRef.current) {
      disposePostProcessing(postProcessingRef.current)
      postProcessingRef.current = null
    }

    if (tablePlaneBodyRef.current) {
      physicsWorld.world.removeBody(tablePlaneBodyRef.current)
      tablePlaneBodyRef.current = null
    }
  }, [cleanupBodies])

  // 初始化静态骰子，点数1面朝上
  const initStaticDice = useCallback(() => {
    if (!diceSceneRef.current) return

    // 根据数量创建多个骰子，水平排列
    const spacing = 1.2
    const startX = -((count - 1) * spacing) / 2

    for (let i = 0; i < count; i++) {
      const dice = createD6Dice(color)
      // 点数1在 +z 面（前面），绕 x 轴旋转 -90度 让它朝上
      dice.position.set(startX + i * spacing, 0.6, 0)
      dice.rotation.x = -Math.PI / 2
      diceSceneRef.current.scene.add(dice)
      diceRef.current.push(dice)
    }

    // 渲染一帧
    renderScene(diceSceneRef.current)
  }, [count, color])

  useReady(() => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    const isTT = Taro.getEnv() === Taro.ENV_TYPE.TT
    const isMini = isWeapp || isTT

    if (isMini) {
      const initMiniPlatform = async () => {
        const query = Taro.createSelectorQuery()
        query
          .select('#diceCanvas')
          .fields({ node: true, size: true })
          .exec(async (res) => {
            if (res[0]?.node) {
              const canvas = res[0].node
              const width = res[0].width || 375
              const height = res[0].height || 400

              // 根据平台选择对应的 Platform
              let platform: any
              if (isWeapp) {
                const { WechatPlatform } = await import('three-platformize/src/WechatPlatform')
                platform = new WechatPlatform(canvas)
              } else if (isTT) {
                const { BytePlatform } = await import('three-platformize/src/BytePlatform')
                platform = new BytePlatform(canvas, width, height)
              }
              THREE.PLATFORM.set(platform)

              // Set up requestAnimationFrame for mini-program
              rafRef.current = (callback: FrameRequestCallback) => {
                return canvas.requestAnimationFrame(callback)
              }

              canvasNodeRef.current = canvas
              // 小程序端提高渲染分辨率以抗锯齿（2x 超采样）
              diceSceneRef.current = createDiceScene(canvas, width, height, 2, theme.sceneBg, theme.groundColor)

              // 小程序端不启用 PostProcessing（EffectComposer 与小程序 WebGL 不兼容）

              performanceRef.current = new PerformanceMonitor()

              if (!tablePlaneBodyRef.current) {
                tablePlaneBodyRef.current = createTablePlane()
              }

              canvasReadyRef.current = true

              // 初始化静态骰子，点数1面朝上
              initStaticDice()
            }
          })
      }
      initMiniPlatform()
    } else {
      const initH5Canvas = (retryCount = 0) => {
        const canvasEl = document.getElementById('diceCanvas')
        const canvas = (canvasEl?.querySelector('canvas') || canvasEl) as HTMLCanvasElement
        if (!canvas || !canvas.getContext) {
          if (retryCount < 10) {
            setTimeout(() => initH5Canvas(retryCount + 1), 100)
          }
          return
        }
        const width = canvas.width || canvas.clientWidth || 375
        const height = canvas.height || canvas.clientHeight || 400

        canvasNodeRef.current = canvas
        diceSceneRef.current = createDiceScene(canvas, width, height, 1, theme.sceneBg, theme.groundColor)

        postProcessingRef.current = createPostProcessing(
          diceSceneRef.current.renderer,
          diceSceneRef.current.scene,
          diceSceneRef.current.camera
        )

        performanceRef.current = new PerformanceMonitor()

        if (!tablePlaneBodyRef.current) {
          tablePlaneBodyRef.current = createTablePlane()
        }

        canvasReadyRef.current = true

        // 初始化静态骰子，点数1面朝上
        initStaticDice()
      }

      initH5Canvas()
    }

    return () => cleanup()
  })

  useEffect(() => {
    resizeCheckRef.current = setInterval(() => {
      if (!canvasNodeRef.current || !diceSceneRef.current) return
      const query = Taro.createSelectorQuery()
      query
        .select('#diceCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !diceSceneRef.current) return
          const w = res[0].width
          const h = res[0].height
          if (w > 0 && h > 0) {
            const { renderer, camera } = diceSceneRef.current
            const currentSize = renderer.getSize(new THREE.Vector2())
            if (currentSize.width !== w || currentSize.height !== h) {
              renderer.setSize(w, h)
              camera.aspect = w / h
              camera.updateProjectionMatrix()
            }
          }
        })
    }, 300)
    return () => {
      if (resizeCheckRef.current) clearInterval(resizeCheckRef.current)
    }
  }, [])

  // 当属性变化时重新初始化静态骰子
  useEffect(() => {
    if (!canvasReadyRef.current || !diceSceneRef.current || animatingRef.current) return

    // 清除当前静态骰子
    diceRef.current.forEach((dice) => {
      diceSceneRef.current?.scene.remove(dice)
      disposeD6Dice(dice)
    })
    diceRef.current = []

    // 重新创建静态骰子
    initStaticDice()
  }, [count, color, theme, initStaticDice])

  const renderLoopRef = useRef<() => void>(() => {})

  // 静态渲染：动画结束后保持场景绘制，防止 React re-render 清空 canvas
  const staticRenderRef = useRef<() => void>(() => {})

  staticRenderRef.current = () => {
    if (!diceSceneRef.current) return
    diceSceneRef.current.scene.background = new THREE.Color(theme.sceneBg)
    diceSceneRef.current.renderer.setClearColor(theme.sceneBg, 1)
    const groundMaterial = diceSceneRef.current.ground.material as THREE.MeshBasicMaterial
    groundMaterial.color.set(theme.groundColor)
    renderScene(diceSceneRef.current)
  }

  renderLoopRef.current = () => {
    if (!animatingRef.current || !diceSceneRef.current) return

    performanceRef.current?.update()
    const level = performanceRef.current?.getLevel() || 'high'
    const config = getEffectsConfig(level)

    const delta = Math.min((Date.now() - lastFrameTimeRef.current) / 1000, 1 / 30)
    lastFrameTimeRef.current = Date.now()
    physicsWorld.step(delta)

    // 限制骰子位置，防止滚出屏幕
    const BOUND = 2.5
    bodiesRef.current.forEach((body) => {
      if (body.position.x > BOUND && body.velocity.x > 0) body.velocity.x = 0
      if (body.position.x < -BOUND && body.velocity.x < 0) body.velocity.x = 0
      if (body.position.z > BOUND && body.velocity.z > 0) body.velocity.z = 0
      if (body.position.z < -BOUND && body.velocity.z < 0) body.velocity.z = 0
      if (body.position.y < 0.5) { body.position.y = 0.5; body.velocity.y = 0 }
      body.position.x = Math.max(-BOUND, Math.min(BOUND, body.position.x))
      body.position.z = Math.max(-BOUND, Math.min(BOUND, body.position.z))
    })

    bodiesRef.current.forEach((body, index) => {
      if (diceRef.current[index]) {
        updateDiceTransform(diceRef.current[index], body.position, body.quaternion)
      }
    })

    if (config.enablePostProcessing && postProcessingRef.current) {
      renderWithPostProcessing(postProcessingRef.current)
    } else {
      renderScene(diceSceneRef.current)
    }

    // 检查超时或骰子停止
    const elapsed = Date.now() - startTimeRef.current
    const allStopped = bodiesRef.current.length > 0 && bodiesRef.current.every(isDiceStopped)

    if (allStopped) {
      stopCounterRef.current++
    } else {
      stopCounterRef.current = 0
    }

    if (stopCounterRef.current >= STOP_FRAME_THRESHOLD || elapsed > MAX_ANIMATION_TIME) {
      if (!resultsReportedRef.current) {
        const results = bodiesRef.current.map(getTopFaceD6)
        onResultRef.current(results)
        resultsReportedRef.current = true
        animatingRef.current = false

        // 立即重绘一帧，确保 canvas 有内容
        renderScene(diceSceneRef.current)

        onAnimationEndRef.current()
      }
    }

    if (rafRef.current) {
      rafRef.current(() => renderLoopRef.current())
    } else if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      intervalRef.current = setTimeout(() => renderLoopRef.current(), 1000 / 60)
    } else {
      animationFrameRef.current = requestAnimationFrame(() => renderLoopRef.current())
    }
  }

  const throwDice = useCallback(() => {
    if (!canvasReadyRef.current || !diceSceneRef.current) {
      console.warn('[PhysicsDice] Canvas 未就绪，无法投掷')
      onAnimationEndRef.current()
      return
    }

    cleanupBodies()
    animatingRef.current = true
    stopCounterRef.current = 0
    resultsReportedRef.current = false
    startTimeRef.current = Date.now()
    lastFrameTimeRef.current = Date.now()
    onAnimationStart()

    for (let i = 0; i < count; i++) {
      const body = createD6Body()
      applyThrowForce(body)
      physicsWorld.world.addBody(body)
      bodiesRef.current.push(body)

      const dice = createD6Dice(color)
      diceSceneRef.current.scene.add(dice)
      diceRef.current.push(dice)
    }

    renderLoopRef.current()
  }, [count, color, theme, cleanupBodies, onAnimationStart])

  useImperativeHandle(ref, () => ({ throwDice }), [throwDice])

  // 动画结束后每次渲染都重绘场景，防止 React re-render 清空 canvas
  useLayoutEffect(() => {
    staticRenderRef.current()
  })

  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const isTT = Taro.getEnv() === Taro.ENV_TYPE.TT
  const isMini = isWeapp || isTT

  return (
    <View className="w-full h-full overflow-hidden">
      {isMini ? (
        <Canvas id="diceCanvas" type="webgl" style={{ width: '100%', height: '100%' }} />
      ) : (
        <canvas
          id="diceCanvas"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </View>
  )
})

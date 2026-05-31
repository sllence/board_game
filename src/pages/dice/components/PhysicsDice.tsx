import { View, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { adapter } from '@minisheep/three-platform-adapter'
import { physicsWorld } from '@/lib/physics/world'
import { createD6Body, applyThrowForce } from '@/lib/physics/dice-body'
import { createTablePlane } from '@/lib/physics/table-plane'
import { getTopFaceD6, isDiceStopped } from '@/lib/physics/utils'
import { createDiceScene, renderScene, DiceScene } from '@/lib/three/scene'
import { createD6Dice, updateDiceTransform, disposeD6Dice } from '@/lib/three/dice'
import {
  TrailParticleSystem,
  SparkParticleSystem,
  GlowParticleSystem,
  AmbientParticleSystem,
} from '@/lib/three/particles'
import {
  createPostProcessing,
  disposePostProcessing,
  renderWithPostProcessing,
  PostProcessing,
} from '@/lib/three/postprocessing'
import { PerformanceMonitor, getEffectsConfig } from '@/lib/three/performance'

const STOP_FRAME_THRESHOLD = 30
const VELOCITY_THRESHOLD = 0.5
const MAX_ANIMATION_TIME = 5000

interface PhysicsDiceProps {
  count: number
  onResult: (results: number[]) => void
  onAnimationStart: () => void
  onAnimationEnd: () => void
}

export interface PhysicsDiceHandle {
  throwDice: () => void
}

export const PhysicsDice = forwardRef<PhysicsDiceHandle, PhysicsDiceProps>(
  ({ count, onResult, onAnimationStart, onAnimationEnd }, ref) => {
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
  const lastFrameTimeRef = useRef(Date.now())

  const trailRef = useRef<TrailParticleSystem | null>(null)
  const sparkRef = useRef<SparkParticleSystem | null>(null)
  const glowRef = useRef<GlowParticleSystem | null>(null)
  const ambientRef = useRef<AmbientParticleSystem | null>(null)
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

    if (ambientRef.current && diceSceneRef.current) {
      diceSceneRef.current.scene.remove(ambientRef.current.getPoints())
    }
    if (sparkRef.current && diceSceneRef.current) {
      diceSceneRef.current.scene.remove(sparkRef.current.getPoints())
    }

    trailRef.current?.dispose()
    sparkRef.current?.dispose()
    glowRef.current?.dispose()
    ambientRef.current?.dispose()
    trailRef.current = null
    sparkRef.current = null
    glowRef.current = null
    ambientRef.current = null

    if (tablePlaneBodyRef.current) {
      physicsWorld.world.removeBody(tablePlaneBodyRef.current)
      tablePlaneBodyRef.current = null
    }
  }, [cleanupBodies])

  useReady(() => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    const isTT = Taro.getEnv() === Taro.ENV_TYPE.TT
    const isMini = isWeapp || isTT

    if (isMini) {
      adapter.useCanvas('#diceCanvas', Taro.createSelectorQuery()).then(({ canvas, requestAnimationFrame }) => {
        rafRef.current = requestAnimationFrame
        const query = Taro.createSelectorQuery()
        query
          .select('#diceCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0]?.node) {
              const width = res[0].width || 375
              const height = res[0].height || 400

              canvasNodeRef.current = canvas
              diceSceneRef.current = createDiceScene(canvas, width, height)

              postProcessingRef.current = createPostProcessing(
                diceSceneRef.current.renderer,
                diceSceneRef.current.scene,
                diceSceneRef.current.camera
              )

              trailRef.current = new TrailParticleSystem()
              sparkRef.current = new SparkParticleSystem()
              glowRef.current = new GlowParticleSystem()
              ambientRef.current = new AmbientParticleSystem()

              if (ambientRef.current) {
                diceSceneRef.current.scene.add(ambientRef.current.getPoints())
              }
              if (sparkRef.current) {
                diceSceneRef.current.scene.add(sparkRef.current.getPoints())
              }

              performanceRef.current = new PerformanceMonitor()

              if (!tablePlaneBodyRef.current) {
                tablePlaneBodyRef.current = createTablePlane()
              }

              canvasReadyRef.current = true
            }
          })
      })
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
        diceSceneRef.current = createDiceScene(canvas, width, height)

        postProcessingRef.current = createPostProcessing(
          diceSceneRef.current.renderer,
          diceSceneRef.current.scene,
          diceSceneRef.current.camera
        )

        trailRef.current = new TrailParticleSystem()
        sparkRef.current = new SparkParticleSystem()
        glowRef.current = new GlowParticleSystem()
        ambientRef.current = new AmbientParticleSystem()

        if (ambientRef.current) {
          diceSceneRef.current.scene.add(ambientRef.current.getPoints())
        }
        if (sparkRef.current) {
          diceSceneRef.current.scene.add(sparkRef.current.getPoints())
        }

        performanceRef.current = new PerformanceMonitor()

        if (!tablePlaneBodyRef.current) {
          tablePlaneBodyRef.current = createTablePlane()
        }

        canvasReadyRef.current = true
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

  const renderLoopRef = useRef<() => void>(() => {})

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

    if (config.enableTrail && trailRef.current) {
      bodiesRef.current.forEach((body) => {
        if (body.velocity.length() > VELOCITY_THRESHOLD) {
          trailRef.current!.emit(
            new THREE.Vector3(body.position.x, body.position.y, body.position.z)
          )
        }
      })
      trailRef.current.update(delta)
    }

    if (config.enableSpark) {
      sparkRef.current?.update(delta)
    }

    if (config.enableGlow) {
      glowRef.current?.update(delta)
    }

    if (config.enableAmbient) {
      ambientRef.current?.update(delta)
    }

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
      const results = bodiesRef.current.map(getTopFaceD6)
      onResultRef.current(results)
      animatingRef.current = false
      onAnimationEndRef.current()

      if (config.enableGlow && glowRef.current && diceSceneRef.current) {
        bodiesRef.current.forEach((body) => {
          glowRef.current!.show(
            new THREE.Vector3(body.position.x, body.position.y, body.position.z),
            diceSceneRef.current!.scene
          )
        })
      }
      return
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
      return
    }

    cleanupBodies()
    animatingRef.current = true
    stopCounterRef.current = 0
    startTimeRef.current = Date.now()
    lastFrameTimeRef.current = Date.now()
    onAnimationStart()

    for (let i = 0; i < count; i++) {
      const body = createD6Body()
      applyThrowForce(body)
      physicsWorld.world.addBody(body)
      bodiesRef.current.push(body)

      body.addEventListener('collide', (e: any) => {
        const contactPoint = e.contact?.bi?.position || body.position
        sparkRef.current?.emit(
          new THREE.Vector3(contactPoint.x, contactPoint.y, contactPoint.z)
        )
      })

      const dice = createD6Dice()
      diceSceneRef.current.scene.add(dice)
      diceRef.current.push(dice)
    }

    renderLoopRef.current()
  }, [count, cleanupBodies, onAnimationStart])

  useImperativeHandle(ref, () => ({ throwDice }), [throwDice])

  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const isTT = Taro.getEnv() === Taro.ENV_TYPE.TT
  const isMini = isWeapp || isTT

  return (
    <View className="w-full h-full overflow-hidden">
      {isMini ? (
        <Canvas id="diceCanvas" type="webgl" className="w-full h-full" />
      ) : (
        <canvas
          id="diceCanvas"
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </View>
  )
})

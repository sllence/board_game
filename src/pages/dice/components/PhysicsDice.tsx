import { View, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
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

let tablePlaneCreated = false

const STOP_FRAME_THRESHOLD = 30
const VELOCITY_THRESHOLD = 0.5

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
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasReadyRef = useRef(false)
  const performanceRef = useRef<PerformanceMonitor | null>(null)

  const trailRef = useRef<TrailParticleSystem | null>(null)
  const sparkRef = useRef<SparkParticleSystem | null>(null)
  const glowRef = useRef<GlowParticleSystem | null>(null)
  const ambientRef = useRef<AmbientParticleSystem | null>(null)

  const onResultRef = useRef(onResult)
  const onAnimationEndRef = useRef(onAnimationEnd)
  onResultRef.current = onResult
  onAnimationEndRef.current = onAnimationEnd

  const cleanup = useCallback(() => {
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

    performanceRef.current?.dispose()
    if (postProcessingRef.current) {
      disposePostProcessing(postProcessingRef.current)
      postProcessingRef.current = null
    }

    if (ambientRef.current && diceSceneRef.current) {
      diceSceneRef.current.scene.remove(ambientRef.current.getPoints())
    }

    trailRef.current?.dispose()
    sparkRef.current?.dispose()
    glowRef.current?.dispose()
    ambientRef.current?.dispose()
    trailRef.current = null
    sparkRef.current = null
    glowRef.current = null
    ambientRef.current = null
  }, [])

  useReady(() => {
    const query = Taro.createSelectorQuery()
    query
      .select('#diceCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]?.node) {
          const canvas = res[0].node
          const width = res[0].width || 375
          const height = res[0].height || 400

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

          performanceRef.current = new PerformanceMonitor((level) => {
            console.log('Performance level:', level)
          })

          if (!tablePlaneCreated) {
            createTablePlane()
            tablePlaneCreated = true
          }

          canvasReadyRef.current = true
        }
      })

    return () => cleanup()
  })

  const renderLoopRef = useRef<() => void>(() => {})

  renderLoopRef.current = () => {
    if (!animatingRef.current || !diceSceneRef.current) return

    performanceRef.current?.update()
    const level = performanceRef.current?.getLevel() || 'high'
    const config = getEffectsConfig(level)

    physicsWorld.step(1 / 60)

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
      trailRef.current.update(1 / 60)
    }

    if (config.enableSpark) {
      sparkRef.current?.update(1 / 60)
    }

    if (config.enableGlow) {
      glowRef.current?.update(1 / 60)
    }

    if (config.enableAmbient) {
      ambientRef.current?.update(1 / 60)
    }

    if (config.enablePostProcessing && postProcessingRef.current) {
      renderWithPostProcessing(postProcessingRef.current)
    } else {
      renderScene(diceSceneRef.current)
    }

    if (bodiesRef.current.length > 0 && bodiesRef.current.every(isDiceStopped)) {
      stopCounterRef.current++

      if (stopCounterRef.current >= STOP_FRAME_THRESHOLD) {
        const results = bodiesRef.current.map(getTopFaceD6)
        onResultRef.current(results)
        animatingRef.current = false
        onAnimationEndRef.current()

        if (config.enableGlow && glowRef.current) {
          bodiesRef.current.forEach((body) => {
            glowRef.current!.show(
              new THREE.Vector3(body.position.x, body.position.y, body.position.z)
            )
          })
        }
        return
      }
    } else {
      stopCounterRef.current = 0
    }

    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
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

    cleanup()
    animatingRef.current = true
    stopCounterRef.current = 0
    onAnimationStart()

    for (let i = 0; i < count; i++) {
      const body = createD6Body()
      applyThrowForce(body)
      physicsWorld.world.addBody(body)
      bodiesRef.current.push(body)

      const dice = createD6Dice()
      diceSceneRef.current.scene.add(dice)
      diceRef.current.push(dice)
    }

    renderLoopRef.current()
  }, [count, cleanup, onAnimationStart])

  useImperativeHandle(ref, () => ({ throwDice }), [throwDice])

  return (
    <View className="w-full h-[400px]">
      <Canvas id="diceCanvas" type="webgl" className="w-full h-full" />
    </View>
  )
})

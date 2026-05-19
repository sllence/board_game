import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Settings } from 'lucide-react-taro'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import type { FC } from 'react'
import './index.scss'

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#a855f7', '#ec4899', '#f8fafc', '#fbbf24',
]

type AppState = 'idle' | 'waiting' | 'countdown' | 'animating' | 'result'
type EffectType = 'pulse' | 'scan' | 'explode' | 'ripple'
type ModeType = 'single' | 'multi' | 'group'

interface Particle {
  x: number; y: number; vx: number; vy: number
  alpha: number; radius: number; color: string
  type?: 'round' | 'spark' | 'sparkle'
  rotation?: number
}

interface ShockwaveRing {
  x: number; y: number; startTime: number
  duration: number; maxR: number; color: string
}

interface DomTouchPoint {
  id: number; x: number; y: number; color: string
  state: 'active' | 'winner' | 'eliminated'
  particles: Particle[]
  sparkles?: { angle: number; dist: number; speed: number }[]
}

interface AppSettings {
  mode: ModeType
  count: number
  effect: EffectType
}

const DEFAULT_SETTINGS: AppSettings = { mode: 'single', count: 2, effect: 'pulse' }
const SETTINGS_KEY = 'fingerPickerSettings'
const COUNTDOWN_DURATION = 3000

const FingerPickerPage: FC = () => {
  const [appState, _setAppState] = useState<AppState>('idle')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 375, height: 667 })
  const [touchPoints, _setTouchPoints] = useState<DomTouchPoint[]>([])
  const [countdownValue, setCountdownValue] = useState(3)

  const ctxRef = useRef<any>(null)
  const colorIndexRef = useRef(0)
  const countdownStartRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const animStartRef = useRef<number>(0)
  const winnersRef = useRef<number[]>([])
  const scanAngleRef = useRef(0)
  const rippleWavesRef = useRef<{ r: number; alpha: number; color: string; lineWidth: number }[]>([])
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const screenSizeRef = useRef({ width: 375, height: 667 })
  const shockwavesRef = useRef<ShockwaveRing[]>([])
  const syncRafRef = useRef<number>(0)
  const pendingMovesRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const appStateRef = useRef<AppState>('idle')
  const touchPointsRef = useRef<DomTouchPoint[]>([])

  const setAppState = useCallback((s: AppState) => {
    appStateRef.current = s
    _setAppState(s)
  }, [])

  const setTouchPoints = useCallback((updater: DomTouchPoint[] | ((prev: DomTouchPoint[]) => DomTouchPoint[])) => {
    _setTouchPoints(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      touchPointsRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    screenSizeRef.current = { width: info.windowWidth, height: info.windowHeight }
    setScreenSize({ width: info.windowWidth, height: info.windowHeight })

    try {
      const saved = Taro.getStorageSync(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(parsed)
        settingsRef.current = parsed
      }
    } catch { /* ignore */ }

    return () => {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(syncRafRef.current)
    }
  }, [])

  useReady(() => {
    const query = Taro.createSelectorQuery()
    query.select('#fingerCanvas').fields({ node: true, size: true }).exec((res) => {
      if (res[0]?.node) {
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = Taro.getSystemInfoSync().pixelRatio
        const info = Taro.getSystemInfoSync()
        canvas.width = info.windowWidth * dpr
        canvas.height = info.windowHeight * dpr
        ctx.scale(dpr, dpr)
        ctxRef.current = ctx
      }
    })
  })

  // 同步 pending 坐标到 state（rAF 节流）
  const syncPendingMoves = useCallback(() => {
    if (pendingMovesRef.current.size > 0) {
      setTouchPoints(prev => {
        const updated = prev.map(pt => {
          const pending = pendingMovesRef.current.get(pt.id)
          if (pending) {
            return { ...pt, x: pending.x, y: pending.y }
          }
          return pt
        })
        pendingMovesRef.current.clear()
        return updated
      })
    }
    syncRafRef.current = requestAnimationFrame(syncPendingMoves)
  }, [])

  useEffect(() => {
    syncRafRef.current = requestAnimationFrame(syncPendingMoves)
    return () => cancelAnimationFrame(syncRafRef.current)
  }, [syncPendingMoves])

  const assignColor = (): string => {
    const color = COLORS[colorIndexRef.current % COLORS.length]
    colorIndexRef.current++
    return color
  }

  const handleTouchStart = (e: any) => {
    if (appState === 'animating' || appState === 'result') return
    const touches = e.touches || e.changedTouches || []
    let addedNew = false
    const newPoints: DomTouchPoint[] = []

    for (const t of touches) {
      const existing = touchPoints.find(p => p.id === t.identifier)
      if (!existing) {
        addedNew = true
        const px = t.x ?? t.clientX ?? t.pageX ?? 0
        const py = t.y ?? t.clientY ?? t.pageY ?? 0
        const color = assignColor()
        newPoints.push({
          id: t.identifier, x: px, y: py, color,
          state: 'active', particles: [],
        })
        shockwavesRef.current.push({
          x: px, y: py, startTime: Date.now(),
          duration: 350, maxR: 70, color,
        })
      }
    }

    if (newPoints.length > 0) {
      setTouchPoints(prev => [...prev, ...newPoints])
    }

    if (addedNew && touchPoints.length + newPoints.length >= 2) {
      countdownStartRef.current = Date.now()
      setCountdownValue(3)
    }

    updateStateFromTouches(touchPoints.length + newPoints.length)
  }

  const handleTouchMove = (e: any) => {
    if (appState === 'animating' || appState === 'result') return
    const touches = e.touches || e.changedTouches || []
    for (const t of touches) {
      pendingMovesRef.current.set(t.identifier, {
        x: t.x ?? t.clientX ?? t.pageX ?? 0,
        y: t.y ?? t.clientY ?? t.pageY ?? 0,
      })
    }
  }

  const handleTouchEnd = (e: any) => {
    if (appState === 'animating') return
    if (appState === 'result') {
      resetAll()
      return
    }
    const ended = e.changedTouches || []
    const endedIds = new Set(Array.from(ended).map((t: any) => t.identifier))
    setTouchPoints(prev => {
      const remaining = prev.filter(p => !endedIds.has(p.id))
      colorIndexRef.current = 0
      return remaining.map((pt, i) => ({
        ...pt,
        color: COLORS[i % COLORS.length],
      }))
    })
    colorIndexRef.current = touchPoints.length - endedIds.size
    updateStateFromTouches(touchPoints.length - endedIds.size)
  }

  const updateStateFromTouches = (count: number) => {
    if (count === 0) {
      setAppState('idle')
      countdownStartRef.current = 0
    } else if (count === 1) {
      setAppState('waiting')
      countdownStartRef.current = 0
    } else {
      if (appState !== 'countdown') {
        countdownStartRef.current = Date.now()
        setCountdownValue(3)
      }
      setAppState('countdown')
    }
  }

  const resetAll = () => {
    setTouchPoints([])
    colorIndexRef.current = 0
    winnersRef.current = []
    rippleWavesRef.current = []
    shockwavesRef.current = []
    scanAngleRef.current = 0
    countdownStartRef.current = 0
    setAppState('idle')
  }

  // 倒计时逻辑（每秒更新）
  useEffect(() => {
    if (appState !== 'countdown') return
    const timer = setInterval(() => {
      const elapsed = Date.now() - countdownStartRef.current
      const remaining = Math.ceil((COUNTDOWN_DURATION - elapsed) / 1000)
      setCountdownValue(Math.max(1, remaining))
      if (elapsed >= COUNTDOWN_DURATION) {
        triggerAnimation()
      }
    }, 100)
    return () => clearInterval(timer)
  }, [appState])

  // ── Animation logic ──

  const triggerAnimation = useCallback(() => {
    if (appState === 'animating') return
    setAppState('animating')
    animStartRef.current = Date.now()
    const pts = touchPoints
    const s = settingsRef.current
    let winnerIds: number[] = []
    if (s.mode === 'single') {
      const w = pts[Math.floor(Math.random() * pts.length)]
      winnerIds = [w.id]
    } else if (s.mode === 'multi') {
      const n = Math.min(s.count, pts.length - 1)
      const shuffled = [...pts].sort(() => Math.random() - 0.5)
      winnerIds = shuffled.slice(0, n).map((p) => p.id)
    } else {
      const n = Math.max(2, Math.min(s.count, pts.length))
      const shuffled = [...pts].sort(() => Math.random() - 0.5)
      const groupColors = COLORS.slice(0, n)
      setTouchPoints(prev => prev.map((pt) => {
        const idx = shuffled.findIndex(sp => sp.id === pt.id)
        return { ...pt, color: groupColors[idx % n] }
      }))
      winnerIds = pts.map((p) => p.id)
    }
    winnersRef.current = winnerIds
    setTouchPoints(prev => prev.map(pt => ({
      ...pt,
      state: winnerIds.includes(pt.id) ? 'winner' : 'eliminated',
    })))
    playEffect(s.effect, pts, winnerIds)
  }, [appState, touchPoints])

  const finishAnimation = useCallback(() => {
    setTouchPoints(prev => prev.map(pt => {
      if (pt.state === 'winner') {
        return {
          ...pt,
          sparkles: Array.from({ length: 6 }, (_, i) => ({
            angle: (i / 6) * Math.PI * 2 + Math.random() * 0.5,
            dist: 52 + Math.random() * 16,
            speed: 0.5 + Math.random() * 0.5,
          })),
        }
      }
      return pt
    }))
    touchPoints.forEach(pt => {
      if (pt.state === 'winner') {
        shockwavesRef.current.push({
          x: pt.x, y: pt.y, startTime: Date.now(),
          duration: 600, maxR: 140, color: pt.color,
        })
      }
    })
    setAppState('result')
  }, [touchPoints])

  const playEffect = useCallback((effect: EffectType, pts: DomTouchPoint[], winnerIds: number[]) => {
    const eliminated = pts.filter((p) => !winnerIds.includes(p.id))
    const W = screenSizeRef.current.width
    const H = screenSizeRef.current.height

    if (effect === 'pulse') {
      const order = [...eliminated].sort(() => Math.random() - 0.5)
      order.forEach((pt, i) => {
        setTimeout(() => {
          const start = Date.now()
          shockwavesRef.current.push({
            x: pt.x, y: pt.y, startTime: start,
            duration: 450, maxR: 100, color: pt.color,
          })
          for (let j = 0; j < 10; j++) {
            const angle = (j / 10) * Math.PI * 2
            pt.particles.push({
              x: pt.x, y: pt.y,
              vx: Math.cos(angle) * (2.5 + Math.random()), vy: Math.sin(angle) * (2.5 + Math.random()),
              alpha: 1, radius: 2 + Math.random() * 2, color: pt.color,
            })
          }
          const fade = () => {
            const t = Math.min((Date.now() - start) / 450, 1)
            pt.particles.forEach(p => {
              p.x += p.vx; p.y += p.vy
              p.vx *= 0.94; p.vy *= 0.94
              p.alpha = Math.max(0, 1 - t * 1.5)
            })
            if (t < 1) requestAnimationFrame(fade)
            else if (i === order.length - 1) finishAnimation()
          }
          requestAnimationFrame(fade)
        }, i * 450)
      })
      if (eliminated.length === 0) finishAnimation()
      startCanvasRender()

    } else if (effect === 'scan') {
      const duration = 2800
      const start = Date.now()
      const hitSet = new Set<number>()

      const scan = () => {
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        scanAngleRef.current = easeOut * 4 * Math.PI * 2

        if (scanAngleRef.current > 2 * Math.PI * 2) {
          const beamAngle = scanAngleRef.current % (Math.PI * 2)
          eliminated.forEach((pt) => {
            if (hitSet.has(pt.id)) return
            const ptAngle = (Math.atan2(pt.y - H / 2, pt.x - W / 2) + Math.PI * 2) % (Math.PI * 2)
            const diff = Math.min(
              Math.abs(ptAngle - beamAngle),
              Math.PI * 2 - Math.abs(ptAngle - beamAngle),
            )
            if (diff < 0.3) {
              hitSet.add(pt.id)
              shockwavesRef.current.push({
                x: pt.x, y: pt.y, startTime: Date.now(),
                duration: 400, maxR: 80, color: pt.color,
              })
              for (let j = 0; j < 8; j++) {
                const a = (j / 8) * Math.PI * 2
                pt.particles.push({
                  x: pt.x, y: pt.y,
                  vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5,
                  alpha: 1, radius: 2.5, color: pt.color,
                })
              }
            }
          })
        }

        pts.forEach(pt => {
          pt.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy
            p.vx *= 0.95; p.vy *= 0.95
            p.alpha = Math.max(0, p.alpha - 0.025)
          })
        })

        if (progress < 1) requestAnimationFrame(scan)
        else finishAnimation()
      }
      requestAnimationFrame(scan)
      startCanvasRender()

    } else if (effect === 'explode') {
      eliminated.forEach((pt) => {
        for (let i = 0; i < 38; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1.5 + Math.random() * 5.5
          const type: Particle['type'] = i < 24 ? 'round' : i < 32 ? 'spark' : 'sparkle'
          pt.particles.push({
            x: pt.x, y: pt.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: type === 'sparkle' ? 1.5 + Math.random() * 2 : 2 + Math.random() * 5,
            color: type === 'sparkle' ? '#ffffff' : pt.color,
            type, rotation: angle,
          })
        }
        shockwavesRef.current.push({
          x: pt.x, y: pt.y, startTime: Date.now(),
          duration: 500, maxR: 110, color: pt.color,
        })
      })
      const start = Date.now()
      const animParticles = () => {
        const elapsed = Date.now() - start
        pts.forEach((pt) => {
          pt.particles.forEach((p) => {
            p.x += p.vx; p.y += p.vy
            if (p.type === 'sparkle') {
              p.vx *= 0.97; p.vy *= 0.97
              p.alpha = Math.max(0, 1 - elapsed / 800)
            } else if (p.type === 'spark') {
              p.vx *= 0.98; p.vy *= 0.98
              p.vy += 0.04
              p.rotation = Math.atan2(p.vy, p.vx)
              p.alpha = Math.max(0, 1 - elapsed / 1400)
            } else {
              p.vy += 0.1
              p.alpha = Math.max(0, 1 - elapsed / 1200)
            }
          })
        })
        if (elapsed < 1500) requestAnimationFrame(animParticles)
        else finishAnimation()
      }
      requestAnimationFrame(animParticles)
      startCanvasRender()

    } else if (effect === 'ripple') {
      const order = [...eliminated].sort(() => Math.random() - 0.5)
      let waveIndex = 0
      const emitWave = () => {
        if (waveIndex >= order.length) { finishAnimation(); return }
        const pt = order[waveIndex]
        const color = pt.color
        for (let ring = 0; ring < 3; ring++) {
          setTimeout(() => {
            const wave = { r: 0, alpha: 1, color, lineWidth: 8 - ring * 2.5 }
            rippleWavesRef.current.push(wave)
            const start = Date.now()
            const expand = () => {
              const t = Math.min((Date.now() - start) / 750, 1)
              const ease = 1 - (1 - t) * (1 - t)
              wave.r = ease * Math.max(W, H)
              wave.alpha = (1 - t) * (1 - ring * 0.3)
              if (t < 1) requestAnimationFrame(expand)
            }
            requestAnimationFrame(expand)
          }, ring * 100)
        }
        setTimeout(() => {
          waveIndex++
          setTimeout(emitWave, 200)
        }, 180)
      }
      emitWave()
      startCanvasRender()
    }
  }, [finishAnimation])

  // ── Canvas render (仅特效阶段) ──

  const startCanvasRender = useCallback(() => {
    const loop = (now: number) => {
      const ctx = ctxRef.current
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }
      const W = screenSizeRef.current.width
      const H = screenSizeRef.current.height
      const state = appStateRef.current

      if (state !== 'animating' && state !== 'result') {
        cancelAnimationFrame(rafRef.current)
        return
      }

      ctx.clearRect(0, 0, W, H)

      // Shockwave rings
      const nowMs = Date.now()
      shockwavesRef.current = shockwavesRef.current.filter(sw => {
        const t = (nowMs - sw.startTime) / sw.duration
        if (t >= 1) return false
        const r = sw.maxR * t
        const alpha = 0.55 * (1 - t)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2)
        ctx.strokeStyle = sw.color
        ctx.lineWidth = 2.5 * (1 - t) + 0.5
        ctx.stroke()
        ctx.restore()
        return true
      })

      // Ripple waves
      rippleWavesRef.current.forEach((wave) => {
        if (wave.alpha <= 0) return
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = wave.alpha * 0.45
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, wave.r, 0, Math.PI * 2)
        ctx.strokeStyle = wave.color
        ctx.lineWidth = Math.max(1, wave.lineWidth)
        ctx.stroke()
        ctx.restore()
      })

      // Scan beam
      if (state === 'animating' && settingsRef.current.effect === 'scan') {
        ctx.save()
        const cx = W / 2, cy = H / 2
        const angle = scanAngleRef.current
        const maxLen = Math.max(W, H) * 1.2
        const fanHalf = 0.12

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, maxLen, angle - fanHalf, angle + fanHalf)
        ctx.closePath()
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxLen)
        grad.addColorStop(0, 'rgba(255,255,255,0.35)')
        grad.addColorStop(0.4, 'rgba(255,255,255,0.12)')
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = grad
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * maxLen, cy + Math.sin(angle) * maxLen)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.stroke()

        ctx.globalCompositeOperation = 'source-over'
        ctx.restore()
      }

      // Particles
      const pts = touchPointsRef.current
      pts.forEach((pt) => {
        pt.particles.forEach(p => {
          if (p.alpha <= 0) return
          ctx.save()
          ctx.globalAlpha = p.alpha

          if (p.type === 'spark') {
            const len = p.radius * 2.5
            const rot = p.rotation ?? 0
            ctx.beginPath()
            ctx.moveTo(p.x - Math.cos(rot) * len, p.y - Math.sin(rot) * len)
            ctx.lineTo(p.x + Math.cos(rot) * len, p.y + Math.sin(rot) * len)
            ctx.strokeStyle = p.color
            ctx.lineWidth = Math.max(1, p.radius * 0.5)
            ctx.lineCap = 'round'
            ctx.stroke()
          } else if (p.type === 'sparkle') {
            ctx.globalCompositeOperation = 'lighter'
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.fill()
            ctx.globalCompositeOperation = 'source-over'
          } else {
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
            ctx.fillStyle = p.color
            ctx.fill()
          }

          ctx.restore()
        })

        // Winner sparkles
        if (pt.state === 'winner' && pt.sparkles) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          pt.sparkles.forEach(s => {
            s.angle += s.speed * 0.022
            const sx = pt.x + Math.cos(s.angle) * s.dist
            const sy = pt.y + Math.sin(s.angle) * s.dist
            const sparkAlpha = 0.45 + 0.45 * Math.sin(now / 180 + s.angle * 3)
            ctx.globalAlpha = sparkAlpha
            ctx.beginPath()
            ctx.arc(sx, sy, 2, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.fill()
          })
          ctx.globalCompositeOperation = 'source-over'
          ctx.restore()
        }
      })

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const saveSettings = (s: AppSettings) => {
    setSettings(s)
    settingsRef.current = s
    try { Taro.setStorageSync(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }

  const hintText = appState === 'idle' ? '请将手指放在屏幕上'
    : appState === 'waiting' ? '再放一根手指开始倒计时'
    : appState === 'result' ? '点击任意位置重新开始' : ''

  return (
    <View
      className="relative overflow-hidden"
      style={{ width: screenSize.width, height: screenSize.height, background: '#0a0a0f' }}
    >
      {/* Canvas 特效层 */}
      <Canvas
        type="2d"
        id="fingerCanvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: screenSize.width,
          height: screenSize.height,
          pointerEvents: 'none',
        }}
      />

      {/* DOM 触摸点 */}
      {touchPoints.map(pt => (
        <View
          key={pt.id}
          className={`finger-dot ${
            pt.state === 'winner' ? 'finger-dot--winner' :
            pt.state === 'eliminated' ? 'finger-dot--eliminated' : ''
          }`}
          style={{
            position: 'absolute',
            left: pt.x - 48,
            top: pt.y - 48,
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: `${pt.state === 'winner' ? 3.5 : 2.2}px solid ${pt.color}`,
            pointerEvents: 'none',
            boxShadow: pt.state === 'winner'
              ? `0 0 30px ${pt.color}aa, 0 0 60px ${pt.color}66`
              : `0 0 20px ${pt.color}66, 0 0 40px ${pt.color}33`,
          }}
        >
          {/* 内核 */}
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 43.2,
              height: 43.2,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: pt.state === 'winner' ? 0.6 : 0.27,
              background: pt.color,
            }}
          />
          {/* 外层柔光圈 */}
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 144,
              height: 144,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: pt.state === 'winner' ? 0.18 : 0.09,
              background: pt.color,
              pointerEvents: 'none',
            }}
          />
        </View>
      ))}

      {/* 倒计时 */}
      {appState === 'countdown' && (
        <Text
          key={countdownValue}
          className="countdown-number"
        >
          {countdownValue}
        </Text>
      )}

      {/* 提示文字 */}
      {hintText && <Text className="hint-text">{hintText}</Text>}

      {/* 触摸事件捕获层 */}
      <View
        className="touch-layer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 设置按钮 */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger
          className="absolute top-10 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', zIndex: 100 }}
        >
          <Settings size={20} color="#ffffff" />
        </SheetTrigger>
        <SheetContent side="bottom" className="bg-[#1a1a2e] border-t border-white border-opacity-10 pb-10">
          <SheetHeader>
            <SheetTitle className="text-white">设置</SheetTitle>
          </SheetHeader>

          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">选人模式</Text>
            <View className="flex flex-row gap-2">
              {(['single', 'multi', 'group'] as ModeType[]).map((m) => (
                <View
                  key={m}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center"
                  style={{
                    background: settings.mode === m ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.mode === m ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, mode: m })}
                >
                  <Text className="text-sm text-white">
                    {m === 'single' ? '选1人' : m === 'multi' ? '选多人' : '分组'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {settings.mode !== 'single' && (
            <View className="mt-4 flex flex-row items-center justify-between">
              <Text className="text-sm text-gray-400">
                {settings.mode === 'multi' ? '选几人' : '分几组'}
              </Text>
              <View className="flex flex-row items-center gap-4">
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.max(2, settings.count - 1) })}
                >
                  <Text className="text-white text-lg">-</Text>
                </View>
                <Text className="text-white text-lg font-bold w-6 text-center">{settings.count}</Text>
                <View
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onClick={() => saveSettings({ ...settings, count: Math.min(9, settings.count + 1) })}
                >
                  <Text className="text-white text-lg">+</Text>
                </View>
              </View>
            </View>
          )}

          <View className="mt-4">
            <Text className="text-sm text-gray-400 mb-2 block">动画特效</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {([
                { key: 'pulse', label: '脉冲消除' },
                { key: 'scan', label: '扫描光束' },
                { key: 'explode', label: '粒子爆炸' },
                { key: 'ripple', label: '彩虹波纹' },
              ] as { key: EffectType; label: string }[]).map((e) => (
                <View
                  key={e.key}
                  className="px-4 py-2 rounded-xl"
                  style={{
                    background: settings.effect === e.key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    border: settings.effect === e.key ? '2px solid #6366f1' : '2px solid transparent',
                  }}
                  onClick={() => saveSettings({ ...settings, effect: e.key })}
                >
                  <Text className="text-sm text-white">{e.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  )
}

export default FingerPickerPage

import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Settings } from 'lucide-react-taro'
import { useShare } from '@/hooks/useShare'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import type { FC } from 'react'

const COLORS = [
  '#ef4444', // 红
  '#3b82f6', // 蓝
  '#22c55e', // 绿
  '#f97316', // 橙
  '#a855f7', // 紫
  '#ec4899', // 粉
  '#06b6d4', // 青
  '#facc15', // 亮黄
  '#f97316', // 橙（加深替代琥珀）
  '#8b5cf6', // 紫罗兰（替换灰）
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

interface AmbientDot {
  x: number; y: number; speed: number
  radius: number; maxAlpha: number; phase: number
}

interface TouchPoint {
  id: number; x: number; y: number; color: string
  state: 'active' | 'winner' | 'eliminated'
  particles: Particle[]
  scale: number; alpha: number
  pulsePhase: number; ringRotation: number
  sparkles?: { angle: number; dist: number; speed: number }[]
}

interface AppSettings {
  mode: ModeType
  count: number
  effect: EffectType
}

const DEFAULT_SETTINGS: AppSettings = { mode: 'single', count: 2, effect: 'pulse' }
const SETTINGS_KEY = 'fingerPickerSettings'
const COUNTDOWN_DURATION = 1500
const AMBIENT_COUNT = 25

const FingerPickerPage: FC = () => {
  useShare('手指选人')
  const [, setAppStateDisplay] = useState<AppState>('idle')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 375, height: 667 })

  const ctxRef = useRef<any>(null)
  const touchPointsRef = useRef<Map<number, TouchPoint>>(new Map())
  const colorIndexRef = useRef(0)
  const appStateRef = useRef<AppState>('idle')
  const countdownStartRef = useRef<number>(0)
  const countdownValueRef = useRef(3)
  const rafRef = useRef<number>(0)
  const animStartRef = useRef<number>(0)
  const winnersRef = useRef<number[]>([])
  const scanAngleRef = useRef(0)
  const rippleWavesRef = useRef<{ r: number; alpha: number; color: string; lineWidth: number }[]>([])
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const screenSizeRef = useRef({ width: 375, height: 667 })
  const shockwavesRef = useRef<ShockwaveRing[]>([])
  const ambientRef = useRef<AmbientDot[]>([])
  const resultTimeoutRef = useRef<number>(0)

  const updateAppState = (s: AppState) => {
    appStateRef.current = s
    setAppStateDisplay(s)
  }

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    screenSizeRef.current = { width: info.windowWidth, height: info.windowHeight }
    setScreenSize({ width: info.windowWidth, height: info.windowHeight })

    const W = info.windowWidth
    const H = info.windowHeight
    const dots: AmbientDot[] = []
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      dots.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.15 + Math.random() * 0.35,
        radius: 0.8 + Math.random() * 1.5,
        maxAlpha: 0.08 + Math.random() * 0.14,
        phase: Math.random() * Math.PI * 2,
      })
    }
    ambientRef.current = dots

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
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current)
        resultTimeoutRef.current = 0
      }
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
        startRenderLoop()
      }
    })
  })

  const assignColor = (): string => {
    const color = COLORS[colorIndexRef.current % COLORS.length]
    colorIndexRef.current++
    return color
  }

  const handleTouchStart = (e: any) => {
    if (appStateRef.current === 'animating' || appStateRef.current === 'result') return
    const touches = e.touches || e.changedTouches || []
    let addedNew = false
    for (const t of touches) {
      if (!touchPointsRef.current.has(t.identifier)) {
        addedNew = true
        const px = t.x ?? t.clientX ?? t.pageX ?? 0
        const py = t.y ?? t.clientY ?? t.pageY ?? 0
        const color = assignColor()
        touchPointsRef.current.set(t.identifier, {
          id: t.identifier, x: px, y: py, color,
          state: 'active', particles: [],
          scale: 1, alpha: 1,
          pulsePhase: Math.random() * Math.PI * 2,
          ringRotation: Math.random() * Math.PI * 2,
        })
        shockwavesRef.current.push({
          x: px, y: py, startTime: Date.now(),
          duration: 350, maxR: 70, color,
        })
      }
    }
    if (addedNew && touchPointsRef.current.size >= 2) {
      countdownStartRef.current = Date.now()
      countdownValueRef.current = 3
    }
    updateStateFromTouches()
  }

  const handleTouchMove = (e: any) => {
    if (appStateRef.current === 'animating' || appStateRef.current === 'result') return
    const touches = e.touches || e.changedTouches || []
    for (const t of touches) {
      const pt = touchPointsRef.current.get(t.identifier)
      if (pt) {
        pt.x = t.x ?? t.clientX ?? t.pageX ?? 0
        pt.y = t.y ?? t.clientY ?? t.pageY ?? 0
      }
    }
  }

  const handleTouchEnd = (e: any) => {
    if (appStateRef.current === 'animating') return
    if (appStateRef.current === 'result') {
      // 检查离开的手指中是否有被选中的人
      const ended = e.changedTouches || []
      let winnerLeft = false
      for (const t of ended) {
        if (winnersRef.current.includes(t.identifier)) {
          winnerLeft = true
          break
        }
      }
      // 被选中人离开，2秒后自动重置
      if (winnerLeft && !resultTimeoutRef.current) {
        resultTimeoutRef.current = setTimeout(() => {
          resultTimeoutRef.current = 0
          resetAll()
        }, 1000) as unknown as number
      }
      return
    }
    const ended = e.changedTouches || []
    for (const t of ended) {
      touchPointsRef.current.delete(t.identifier)
    }
    colorIndexRef.current = 0
    touchPointsRef.current.forEach((pt) => {
      pt.color = COLORS[colorIndexRef.current % COLORS.length]
      colorIndexRef.current++
    })
    updateStateFromTouches()
  }

  const updateStateFromTouches = () => {
    const count = touchPointsRef.current.size
    if (count === 0) {
      updateAppState('idle')
      countdownStartRef.current = 0
    } else if (count === 1) {
      updateAppState('waiting')
      countdownStartRef.current = 0
    } else {
      if (appStateRef.current !== 'countdown') {
        countdownStartRef.current = Date.now()
        countdownValueRef.current = 3
      }
      updateAppState('countdown')
    }
  }

  const resetAll = () => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current)
      resultTimeoutRef.current = 0
    }
    touchPointsRef.current.clear()
    colorIndexRef.current = 0
    winnersRef.current = []
    rippleWavesRef.current = []
    shockwavesRef.current = []
    scanAngleRef.current = 0
    countdownStartRef.current = 0
    updateAppState('idle')
  }

  // ── Drawing functions ──

  const drawTouchPoint = useCallback((ctx: any, pt: TouchPoint, now: number) => {
    const { x, y, color, state, scale, alpha } = pt
    if (alpha <= 0) return
    const baseR = 48
    const r = baseR * scale

    ctx.save()
    ctx.globalAlpha = alpha

    if (state === 'active') {
      const breath = 1 + 0.15 * Math.sin(now / 500 + pt.pulsePhase)
      const glowR = r * breath

      // Single soft glow circle (no gradient, just semi-transparent fill)
      ctx.beginPath()
      ctx.arc(x, y, glowR * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = color + '35'
      ctx.fill()

      // Main ring
      ctx.beginPath()
      ctx.arc(x, y, glowR * 0.85, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.stroke()

      // Simple core fill
      ctx.beginPath()
      ctx.arc(x, y, glowR * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = color + '70'
      ctx.fill()
    } else if (state === 'winner') {
      const breath = 1.3 + 0.1 * Math.sin(now / 300)
      const glowR = r * breath

      // Full glow for winners (additive)
      ctx.globalCompositeOperation = 'lighter'
      const grad1 = ctx.createRadialGradient(x, y, glowR * 0.2, x, y, glowR * 2)
      grad1.addColorStop(0, color + '55')
      grad1.addColorStop(1, color + '00')
      ctx.beginPath()
      ctx.arc(x, y, glowR * 2, 0, Math.PI * 2)
      ctx.fillStyle = grad1
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'

      // Rotating dashed ring
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(pt.ringRotation)
      ctx.setLineDash([6, 14])
      ctx.beginPath()
      ctx.arc(0, 0, glowR * 1.15, 0, Math.PI * 2)
      ctx.strokeStyle = color + '88'
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Main ring
      ctx.beginPath()
      ctx.arc(x, y, glowR * 0.85, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 5
      ctx.stroke()

      // Bright core gradient
      const grad3 = ctx.createRadialGradient(x, y, 0, x, y, glowR * 0.5)
      grad3.addColorStop(0, '#ffffffcc')
      grad3.addColorStop(0.4, color + 'cc')
      grad3.addColorStop(1, color + '00')
      ctx.beginPath()
      ctx.arc(x, y, glowR * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = grad3
      ctx.fill()
    } else {
      // eliminated — simple fading circle
      const glowR = r
      ctx.beginPath()
      ctx.arc(x, y, glowR * 0.85, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  }, [])

  const drawParticles = useCallback((ctx: any, pt: TouchPoint) => {
    for (const p of pt.particles) {
      if (p.alpha <= 0) continue
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
    }
  }, [])

  const drawCountdown = useCallback((ctx: any, value: number, w: number, h: number) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const elapsed = Date.now() - countdownStartRef.current
    const perNumber = COUNTDOWN_DURATION / 3
    const inSecond = elapsed % perNumber
    const scaleT = Math.min(inSecond / (280 / 2), 1)
    const easeOut = 1 - (1 - scaleT) * (1 - scaleT)
    const scale = 1 + 0.35 * (1 - easeOut)
    const baseFontSize = Math.min(w, h) * 0.25

    // Glow pulse behind number
    const glowAlpha = 0.18 * (1 - easeOut)
    if (glowAlpha > 0.005) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, baseFontSize * scale * 0.9)
      grad.addColorStop(0, `rgba(255,255,255,${glowAlpha})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, baseFontSize * scale * 0.9, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `bold ${baseFontSize * scale}px sans-serif`
    ctx.fillText(String(value), w / 2, h / 2)
    ctx.restore()
  }, [])

  const drawHint = useCallback((ctx: any, text: string, w: number, h: number) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '16px sans-serif'
    ctx.fillText(text, w / 2, h * 0.12)
    ctx.restore()
  }, [])

  // ── Animation logic ──

  const triggerAnimation = useCallback(() => {
    if (appStateRef.current === 'animating') return
    updateAppState('animating')
    animStartRef.current = Date.now()
    const pts = Array.from(touchPointsRef.current.values())
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
      shuffled.forEach((pt, i) => { pt.color = groupColors[i % n] })
      winnerIds = pts.map((p) => p.id)
    }
    winnersRef.current = winnerIds
    pts.forEach((pt) => {
      pt.state = winnerIds.includes(pt.id) ? 'winner' : 'eliminated'
    })
    playEffect(s.effect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishAnimation = useCallback(() => {
    touchPointsRef.current.forEach((pt) => {
      if (pt.state === 'winner') {
        pt.scale = 1.4
        pt.sparkles = Array.from({ length: 6 }, (_, i) => ({
          angle: (i / 6) * Math.PI * 2 + Math.random() * 0.5,
          dist: 52 + Math.random() * 16,
          speed: 0.5 + Math.random() * 0.5,
        }))
        shockwavesRef.current.push({
          x: pt.x, y: pt.y, startTime: Date.now(),
          duration: 600, maxR: 140, color: pt.color,
        })
      }
    })
    updateAppState('result')
  }, [])

  const playEffect = useCallback((effect: EffectType) => {
    const pts = Array.from(touchPointsRef.current.values())
    const eliminated = pts.filter((p) => p.state === 'eliminated')
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
            if (t < 0.2) {
              pt.scale = 1 + t * 2.5
              pt.alpha = 1
            } else {
              const ft = (t - 0.2) / 0.8
              pt.scale = 1.5 * (1 - ft)
              pt.alpha = 1 - ft
            }
            pt.particles.forEach(p => {
              p.x += p.vx; p.y += p.vy
              p.vx *= 0.94; p.vy *= 0.94
              p.alpha = Math.max(0, 1 - t * 1.5)
            })
            if (t < 1) requestAnimationFrame(fade)
            else {
              pt.alpha = 0
              if (i === order.length - 1) finishAnimation()
            }
          }
          requestAnimationFrame(fade)
        }, i * 450)
      })
      if (eliminated.length === 0) finishAnimation()

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
              pt.alpha = 0; pt.scale = 0
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

        touchPointsRef.current.forEach(pt => {
          pt.particles.forEach(p => {
            p.x += p.vx; p.y += p.vy
            p.vx *= 0.95; p.vy *= 0.95
            p.alpha = Math.max(0, p.alpha - 0.025)
          })
        })

        if (progress < 1) requestAnimationFrame(scan)
        else {
          eliminated.forEach((pt) => { pt.alpha = 0 })
          finishAnimation()
        }
      }
      requestAnimationFrame(scan)

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
        pt.alpha = 0
      })
      const start = Date.now()
      const animParticles = () => {
        const elapsed = Date.now() - start
        touchPointsRef.current.forEach((pt) => {
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
          pt.alpha = 0
          waveIndex++
          setTimeout(emitWave, 200)
        }, 180)
      }
      emitWave()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishAnimation])

  // ── Render loop ──

  const startRenderLoop = useCallback(() => {
    const loop = (now: number) => {
      const ctx = ctxRef.current
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }
      const W = screenSizeRef.current.width
      const H = screenSizeRef.current.height
      const state = appStateRef.current

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, W, H)

      // Ambient floating particles (skip during active touch for perf)
      if (state === 'idle' || state === 'result') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ambientRef.current.forEach(dot => {
          dot.y -= dot.speed
          if (dot.y < -5) { dot.y = H + 5; dot.x = Math.random() * W }
          ctx.globalAlpha = dot.maxAlpha * (0.5 + 0.5 * Math.sin(now / 1200 + dot.phase))
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1

        // 6个彩色小球顺时针转动（仅 idle 状态）
        if (state === 'idle') {
          const cx = W / 2
          const cy = H / 2
          const orbitR = Math.min(W, H) * 0.24
          const ballR = 16
          const idleColors = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']
          const angle = now / 500 // 顺时针
          for (let i = 0; i < 6; i++) {
            const a = angle + (i / 6) * Math.PI * 2
            const bx = cx + Math.cos(a) * orbitR
            const by = cy + Math.sin(a) * orbitR

            // 小球
            ctx.beginPath()
            ctx.arc(bx, by, ballR, 0, Math.PI * 2)
            ctx.fillStyle = idleColors[i]
            ctx.fill()
          }
        }
      }

      if (state === 'countdown') {
        const elapsed = Date.now() - countdownStartRef.current
        const perNumber = COUNTDOWN_DURATION / 3
        const remaining = Math.ceil((COUNTDOWN_DURATION - elapsed) / perNumber)
        countdownValueRef.current = Math.max(1, remaining)
        if (elapsed >= COUNTDOWN_DURATION) triggerAnimation()
      }

      // Shockwave rings (skip if none active)
      if (shockwavesRef.current.length > 0) {
        const nowMs = Date.now()
        shockwavesRef.current = shockwavesRef.current.filter(sw => {
          const t = (nowMs - sw.startTime) / sw.duration
          if (t >= 1) return false
          const r = sw.maxR * t
          const alpha = 0.75 * (1 - t)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = alpha
          ctx.beginPath()
          ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2)
          ctx.strokeStyle = sw.color
          ctx.lineWidth = 4 * (1 - t) + 1
          ctx.stroke()
          ctx.restore()
          return true
        })
      }

      // Ripple waves (skip if none active)
      if (rippleWavesRef.current.length > 0) {
        rippleWavesRef.current.forEach((wave) => {
          if (wave.alpha <= 0) return
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = wave.alpha * 0.65
          ctx.beginPath()
          ctx.arc(W / 2, H / 2, wave.r, 0, Math.PI * 2)
          ctx.strokeStyle = wave.color
          ctx.lineWidth = Math.max(1, wave.lineWidth)
          ctx.stroke()
          ctx.restore()
        })
      }

      // Scan beam (wide gradient fan)
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

      // Touch points
      touchPointsRef.current.forEach((pt) => {
        pt.ringRotation += pt.state === 'winner' ? 0.03 : 0.015
        drawTouchPoint(ctx, pt, now)
        drawParticles(ctx, pt)

        // Winner sparkles
        if (pt.state === 'winner' && pt.sparkles && pt.alpha > 0) {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          pt.sparkles.forEach(s => {
            s.angle += s.speed * 0.022
            const sx = pt.x + Math.cos(s.angle) * s.dist
            const sy = pt.y + Math.sin(s.angle) * s.dist
            const sparkAlpha = 0.45 + 0.45 * Math.sin(now / 180 + s.angle * 3)
            ctx.globalAlpha = sparkAlpha * pt.alpha
            ctx.beginPath()
            ctx.arc(sx, sy, 2, 0, Math.PI * 2)
            ctx.fillStyle = '#ffffff'
            ctx.fill()
          })
          ctx.globalCompositeOperation = 'source-over'
          ctx.restore()
        }
      })

      if (state === 'countdown') drawCountdown(ctx, countdownValueRef.current, W, H)
      if (state === 'idle') drawHint(ctx, '请将手指放在屏幕上', W, H)
      else if (state === 'waiting') drawHint(ctx, '再放一根手指开始倒计时', W, H)
      else if (state === 'result') {
        drawHint(ctx, resultTimeoutRef.current ? '即将自动重置...' : '被选中者离开后自动重置', W, H)
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawTouchPoint, drawParticles, drawCountdown, drawHint])

  const saveSettings = (s: AppSettings) => {
    setSettings(s)
    settingsRef.current = s
    try { Taro.setStorageSync(SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
  }

  return (
    <View
      className="relative overflow-hidden"
      style={{ width: screenSize.width, height: screenSize.height, background: '#0a0a0f' }}
    >
      <Canvas
        type="2d"
        id="fingerCanvas"
        style={{ width: screenSize.width, height: screenSize.height, display: 'block' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger
          className="absolute top-10 right-4 w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)' }}
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

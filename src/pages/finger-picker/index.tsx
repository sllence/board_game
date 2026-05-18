import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useReady } from '@tarojs/taro'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Settings } from 'lucide-react-taro'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import type { FC } from 'react'

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
}

interface TouchPoint {
  id: number; x: number; y: number; color: string
  state: 'active' | 'winner' | 'eliminated'
  particles: Particle[]
  scale: number
  alpha: number
  pulsePhase: number
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
  const rippleWavesRef = useRef<{ r: number; alpha: number; color: string }[]>([])
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)

  const updateAppState = (s: AppState) => {
    appStateRef.current = s
    setAppStateDisplay(s)
  }

  useEffect(() => {
    const info = Taro.getSystemInfoSync()
    setScreenSize({ width: info.windowWidth, height: info.windowHeight })
    try {
      const saved = Taro.getStorageSync(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(parsed)
        settingsRef.current = parsed
      }
    } catch { /* ignore */ }
    return () => { cancelAnimationFrame(rafRef.current) }
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
    for (const t of touches) {
      if (!touchPointsRef.current.has(t.identifier)) {
        touchPointsRef.current.set(t.identifier, {
          id: t.identifier,
          x: t.clientX ?? t.pageX,
          y: t.clientY ?? t.pageY,
          color: assignColor(),
          state: 'active',
          particles: [],
          scale: 1,
          alpha: 1,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
    }
    updateStateFromTouches()
  }

  const handleTouchMove = (e: any) => {
    if (appStateRef.current === 'animating' || appStateRef.current === 'result') return
    const touches = e.touches || e.changedTouches || []
    for (const t of touches) {
      const pt = touchPointsRef.current.get(t.identifier)
      if (pt) {
        pt.x = t.clientX ?? t.pageX
        pt.y = t.clientY ?? t.pageY
      }
    }
  }

  const handleTouchEnd = (e: any) => {
    if (appStateRef.current === 'animating') return
    if (appStateRef.current === 'result') {
      resetAll()
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
    touchPointsRef.current.clear()
    colorIndexRef.current = 0
    winnersRef.current = []
    rippleWavesRef.current = []
    scanAngleRef.current = 0
    countdownStartRef.current = 0
    updateAppState('idle')
  }

  const drawTouchPoint = useCallback((ctx: any, pt: TouchPoint, now: number) => {
    const { x, y, color, state, scale, alpha } = pt
    if (alpha <= 0) return
    const baseR = 48
    const r = baseR * scale

    ctx.save()
    ctx.globalAlpha = alpha

    const breathScale = state === 'active'
      ? 1 + 0.15 * Math.sin(now / 600 + pt.pulsePhase)
      : state === 'winner' ? 1.3 : 1
    const glowR = r * breathScale * 1.6
    const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR)
    grad.addColorStop(0, color + '55')
    grad.addColorStop(1, color + '00')
    ctx.beginPath()
    ctx.arc(x, y, glowR, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, r * breathScale, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = state === 'winner' ? 4 : 2.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, r * breathScale * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = color + (state === 'winner' ? 'cc' : '44')
    ctx.fill()

    ctx.restore()
  }, [])

  const drawParticles = useCallback((ctx: any, pt: TouchPoint) => {
    for (const p of pt.particles) {
      if (p.alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()
    }
  }, [])

  const drawCountdown = useCallback((ctx: any, value: number, w: number, h: number) => {
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `bold ${Math.min(w, h) * 0.25}px sans-serif`
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
      // group: 分组，每组颜色相同
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
      if (pt.state === 'winner') pt.scale = 1.4
    })
    updateAppState('result')
  }, [])

  const playEffect = useCallback((effect: EffectType) => {
    const pts = Array.from(touchPointsRef.current.values())
    const eliminated = pts.filter((p) => p.state === 'eliminated')
    const W = Taro.getSystemInfoSync().windowWidth
    const H = Taro.getSystemInfoSync().windowHeight

    if (effect === 'pulse') {
      const order = [...eliminated].sort(() => Math.random() - 0.5)
      order.forEach((pt, i) => {
        setTimeout(() => {
          const start = Date.now()
          const fade = () => {
            const t = Math.min((Date.now() - start) / 300, 1)
            pt.scale = 1 - t
            pt.alpha = 1 - t
            if (t < 1) requestAnimationFrame(fade)
            else {
              pt.alpha = 0
              if (i === order.length - 1) finishAnimation()
            }
          }
          requestAnimationFrame(fade)
        }, i * 400)
      })
      if (eliminated.length === 0) finishAnimation()

    } else if (effect === 'scan') {
      const duration = 2500
      const start = Date.now()
      const scan = () => {
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        scanAngleRef.current = easeOut * 3 * Math.PI * 2
        if (progress > 0.7) {
          eliminated.forEach((pt) => {
            const angle = Math.atan2(pt.y - H / 2, pt.x - W / 2)
            const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2)
            const beamAngle = scanAngleRef.current % (Math.PI * 2)
            const diff = Math.abs(normalizedAngle - beamAngle)
            if (diff < 0.3 && pt.alpha > 0) pt.alpha = Math.max(0, pt.alpha - 0.05)
          })
        }
        if (progress < 1) requestAnimationFrame(scan)
        else { eliminated.forEach((pt) => { pt.alpha = 0 }); finishAnimation() }
      }
      requestAnimationFrame(scan)

    } else if (effect === 'explode') {
      eliminated.forEach((pt) => {
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 2 + Math.random() * 4
          pt.particles.push({
            x: pt.x, y: pt.y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            alpha: 1, radius: 3 + Math.random() * 4, color: pt.color,
          })
        }
        pt.alpha = 0
      })
      const start = Date.now()
      const animParticles = () => {
        const elapsed = Date.now() - start
        touchPointsRef.current.forEach((pt) => {
          pt.particles.forEach((p) => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.1
            p.alpha = Math.max(0, 1 - elapsed / 1200)
          })
        })
        if (elapsed < 1200) requestAnimationFrame(animParticles)
        else finishAnimation()
      }
      requestAnimationFrame(animParticles)

    } else if (effect === 'ripple') {
      const order = [...eliminated].sort(() => Math.random() - 0.5)
      let waveIndex = 0
      const emitWave = () => {
        if (waveIndex >= order.length) { finishAnimation(); return }
        const color = order[waveIndex].color
        rippleWavesRef.current.push({ r: 0, alpha: 1, color })
        const start = Date.now()
        const expand = () => {
          const t = Math.min((Date.now() - start) / 600, 1)
          const wave = rippleWavesRef.current[rippleWavesRef.current.length - 1]
          wave.r = t * Math.max(W, H)
          wave.alpha = 1 - t
          if (t < 1) requestAnimationFrame(expand)
          else { order[waveIndex].alpha = 0; waveIndex++; setTimeout(emitWave, 200) }
        }
        requestAnimationFrame(expand)
      }
      emitWave()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishAnimation])

  const startRenderLoop = useCallback(() => {
    const loop = (now: number) => {
      const ctx = ctxRef.current
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }
      const W = Taro.getSystemInfoSync().windowWidth
      const H = Taro.getSystemInfoSync().windowHeight
      const state = appStateRef.current

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a0f'
      ctx.fillRect(0, 0, W, H)

      if (state === 'countdown') {
        const elapsed = Date.now() - countdownStartRef.current
        const remaining = Math.ceil((COUNTDOWN_DURATION - elapsed) / 1000)
        countdownValueRef.current = Math.max(1, remaining)
        if (elapsed >= COUNTDOWN_DURATION) triggerAnimation()
      }

      // 波纹
      rippleWavesRef.current.forEach((wave) => {
        if (wave.alpha <= 0) return
        ctx.save()
        ctx.globalAlpha = wave.alpha * 0.4
        ctx.beginPath()
        ctx.arc(W / 2, H / 2, wave.r, 0, Math.PI * 2)
        ctx.strokeStyle = wave.color
        ctx.lineWidth = 6
        ctx.stroke()
        ctx.restore()
      })

      // 扫描光束
      if (state === 'animating' && settingsRef.current.effect === 'scan') {
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.moveTo(W / 2, H / 2)
        ctx.lineTo(
          W / 2 + Math.cos(scanAngleRef.current) * Math.max(W, H),
          H / 2 + Math.sin(scanAngleRef.current) * Math.max(W, H),
        )
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()
      }

      touchPointsRef.current.forEach((pt) => {
        drawTouchPoint(ctx, pt, now)
        drawParticles(ctx, pt)
      })

      if (state === 'countdown') drawCountdown(ctx, countdownValueRef.current, W, H)
      if (state === 'idle') drawHint(ctx, '请将手指放在屏幕上', W, H)
      else if (state === 'waiting') drawHint(ctx, '再放一根手指开始倒计时', W, H)
      else if (state === 'result') drawHint(ctx, '点击任意位置重新开始', W, H)

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

import { View, Text, Canvas, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useReady } from '@tarojs/taro'
import { useState, useCallback, useRef } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { RotateCcw, Share2 } from 'lucide-react-taro'
import type { FC } from 'react'

interface Wheel {
  id: number
  title: string
  type: 'probability' | 'inventory'
  items: any[]
}

const CANVAS_SIZE = 220
const CENTER = CANVAS_SIZE / 2
const RADIUS = CENTER - 10

const WheelSpinPage: FC = () => {
  const [wheel, setWheel] = useState<Wheel | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<{ id: number; result: string; created_at: string }[]>([])
  const ctxRef = useRef<any>(null)
  const wheelRef = useRef<Wheel | null>(null)
  // 存储当前 Canvas 绘制时使用的扇区角度，确保转动计算与视觉一致
  const sectorAnglesRef = useRef<{ startDeg: number; endDeg: number }[]>([])

  const drawWheel = useCallback(() => {
    const currentWheel = wheelRef.current
    if (!currentWheel || !ctxRef.current) return
    const ctx = ctxRef.current
    const items = currentWheel.items
    const sectorAngles = getSectorAngles(currentWheel)

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    sectorAnglesRef.current = sectorAngles

    for (let i = 0; i < items.length; i++) {
      const startDeg = sectorAngles[i].startDeg
      const endDeg = sectorAngles[i].endDeg
      const midDeg = startDeg + (endDeg - startDeg) / 2
      const startAngle = (startDeg * Math.PI) / 180 - Math.PI / 2
      const endAngle = (endDeg * Math.PI) / 180 - Math.PI / 2
      const midAngle = (midDeg * Math.PI) / 180 - Math.PI / 2

      ctx.beginPath()
      ctx.moveTo(CENTER, CENTER)
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = items[i].color || '#4F46E5'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(CENTER, CENTER)
      ctx.rotate(midAngle)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 13px sans-serif'
      const label = items[i].label.length > 5 ? items[i].label.slice(0, 5) + '..' : items[i].label
      ctx.fillText(label, RADIUS - 16, -3)
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, 24, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#4F46E5'
    ctx.fill()
  }, [])

  useReady(() => {
    const query = Taro.createSelectorQuery()
    query
      .select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]?.node) {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio
          canvas.width = CANVAS_SIZE * dpr
          canvas.height = CANVAS_SIZE * dpr
          ctx.scale(dpr, dpr)
          ctxRef.current = ctx
          if (wheelRef.current) {
            drawWheel()
          }
        }
      })
  })

  useDidShow(() => {
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.id
    if (id) {
      fetchWheel(Number(id))
    }
  })

  const fetchWheel = async (id: number, resetResult = true) => {
    try {
      const [wheelRes, historyRes] = await Promise.all([
        Network.request({ url: `/api/wheels/${id}` }),
        Network.request({ url: `/api/wheels/${id}/history` }),
      ])
      const w = wheelRes.data?.data
      if (w) {
        wheelRef.current = w
        setWheel(w)
        if (resetResult) {
          setRotation(0)
          setResult('')
        }
        setTimeout(() => drawWheel(), 50)
      }
      const h = historyRes.data?.data
      if (Array.isArray(h)) {
        setHistory(h)
      }
    } catch (e) {
      console.error('[WheelSpin] fetch error:', e)
    }
  }

  const getSectorAngles = (w: Wheel) => {
    const items = w.items
    let total = 0
    for (const item of items) {
      if (w.type === 'inventory') {
        total += (item.inventory || 0)
      } else {
        total += (item.weight || 1)
      }
    }
    if (total === 0) total = items.length

    const angles: { startDeg: number; endDeg: number }[] = []
    let currentDeg = 0
    for (const item of items) {
      const value = w.type === 'inventory' ? (item.inventory || 0) : (item.weight || 1)
      const deg = (value / total) * 360
      angles.push({ startDeg: currentDeg, endDeg: currentDeg + deg })
      currentDeg += deg
    }
    return angles
  }

  const handleSpin = async () => {
    if (spinning || !wheel) return
    setSpinning(true)

    let winnerIndex = 0
    let winnerLabel = ''

    try {
      const res = await Network.request({
        url: `/api/wheels/${wheel.id}/spin`,
        method: 'POST',
      })
      console.log('[WheelSpin] spin result:', res.data)
      const spinData = res.data?.data
      winnerIndex = spinData?.index || 0
      winnerLabel = spinData?.result || ''
    } catch (e) {
      console.error('[WheelSpin] spin error:', e)
      Taro.showToast({ title: '转动失败', icon: 'none' })
      setSpinning(false)
      return
    }

    // 使用当前 Canvas 绘制时的扇区角度（而非最新的 wheel 数据），
    // 避免库存转盘二次转动时数据已更新但 Canvas 未重绘导致角度不匹配
    const angles = sectorAnglesRef.current.length > 0 ? sectorAnglesRef.current : getSectorAngles(wheel)
    const winnerSector = angles[winnerIndex]
    const targetAngle = winnerSector.startDeg + (winnerSector.endDeg - winnerSector.startDeg) / 2
    console.log('[WheelSpin] winnerIndex:', winnerIndex, 'winnerLabel:', winnerLabel, 'targetAngle:', targetAngle, 'angles:', JSON.stringify(angles))
    const extraSpins = 5 + Math.random() * 3
    const currentRotation = rotation % 360
    // getSectorAngles 的 0° 对应屏幕上方（指针位置），因为 Canvas 绘制时减了 π/2
    // CSS rotate(R) 顺时针旋转 R 度后，指针指向原始角度 (360 - R%360) % 360
    // 要让指针指向 targetAngle：(360 - R%360) % 360 = targetAngle
    // => R%360 = (360 - targetAngle) % 360
    const desiredRotation = (360 - targetAngle + 360) % 360
    let delta = (desiredRotation - currentRotation + 360) % 360
    if (delta === 0) delta = 360
    const targetRotation = rotation + extraSpins * 360 + delta

    const startTime = Date.now()
    const duration = 3000
    const startRot = rotation

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentRot = startRot + (targetRotation - startRot) * easeOut
      setRotation(currentRot)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        // 在转盘中心展示结果
        setResult(winnerLabel)
        // 刷新转盘数据和历史记录（库存模式需要更新库存）
        Promise.all([
          Network.request({ url: `/api/wheels/${wheel.id}` }),
          Network.request({ url: `/api/wheels/${wheel.id}/history` }),
        ])
          .then(([wheelRes, historyRes]) => {
            const w = wheelRes.data?.data
            if (w) {
              wheelRef.current = w
              setWheel(w)
              // 不调用 drawWheel()：保持当前扇区布局不变，
              // 避免指针角度（按旧布局计算）和新扇区大小对不上
            }
            const h = historyRes.data?.data
            if (Array.isArray(h)) {
              setHistory(h)
            }
          })
          .catch((e) => console.error('[WheelSpin] refresh error:', e))
      }
    }

    requestAnimationFrame(animate)
  }

  const handleShare = () => {
    if (!wheel) return
    const shareData = {
      title: wheel.title,
      items: wheel.items,
    }
    Taro.setClipboardData({
      data: JSON.stringify(shareData),
      success: () => {
        Taro.showToast({ title: '转盘数据已复制', icon: 'success' })
      },
    })
  }

  return (
    <View className="flex flex-col min-h-screen bg-gray-50" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-2 pb-2 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">{wheel?.title || '转盘'}</Text>
          <View
            className="flex flex-row items-center justify-center w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200"
            onClick={handleShare}
          >
            <Share2 size={18} color="#6B7280" />
          </View>
        </View>
      </View>

      <View className="flex flex-col">
        <View className="flex flex-col items-center flex-shrink-0 pt-6 pb-3">
          <View className="relative" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
            <Canvas
              type="2d"
              id="wheelCanvas"
              style={{
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'none' : 'transform 0.3s ease-out',

              }}
            />
            <View
              className="absolute"
              style={{
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '20px solid #EF4444',
                zIndex: 10,
              }}
            />
            {/* 中心结果展示 */}
            <View
              className="absolute rounded-full bg-white shadow-md flex items-center justify-center"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: CANVAS_SIZE * 0.32,
                height: CANVAS_SIZE * 0.32,
                zIndex: 10,
              }}
            >
              <Text
                className="text-sm font-bold text-gray-900 text-center px-2"
                style={{ maxWidth: CANVAS_SIZE * 0.28 }}
              >
                {spinning ? '?' : (result || '?')}
              </Text>
            </View>
          </View>

          {wheel?.type === 'inventory' && (
            <View className="w-full px-5 mt-3">
              <View className="flex flex-row flex-wrap gap-2 justify-center">
                {wheel.items.map((item, idx) => (
                  <View
                    key={idx}
                    className="px-3 py-1 rounded-lg flex flex-row items-center gap-1"
                    style={{ backgroundColor: item.color ? item.color + '20' : '#F3F4F6' }}
                  >
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color || '#4F46E5' }}
                    />
                    <Text className="text-xs text-gray-700">{item.label}</Text>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: (item.inventory || 0) === 0 ? '#EF4444' : '#166534' }}
                    >
                      {item.inventory || 0}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="flex flex-row gap-3 mt-3">
            <Button
              className="px-6 py-3"
              onClick={handleSpin}
              disabled={spinning}
            >
              <RotateCcw size={18} color="#fff" />
              <Text className="text-white ml-1">
                {spinning ? '转动中...' : result ? '再次转动' : '开始转动'}
              </Text>
            </Button>
          </View>
        </View>

        {history.length > 0 && (
          <View className="flex flex-col flex-shrink-0 px-5 pt-2 pb-4" style={{ height: '300px' }}>
            <Text className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">历史记录</Text>
            <ScrollView className="flex-1" scrollY style={{ overflowY: 'auto' }}>
              <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {history.map((item, idx) => (
                  <View
                    key={item.id}
                    className={`flex flex-row items-center justify-between px-4 py-3 ${
                      idx !== history.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="flex flex-row items-center gap-2">
                      <Text className="text-xs text-gray-400 w-5">{history.length - idx}</Text>
                      <Text className="text-sm text-gray-800">{item.result}</Text>
                    </View>
                    <Text className="text-xs text-gray-400">
                      {(() => {
                        const s = item.created_at.replace('T', ' ').replace('Z', '').split('.')[0]
                        const d = new Date(s)
                        if (Number.isNaN(d.getTime())) return item.created_at.slice(0, 16).replace('T', ' ')
                        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
                      })()}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  )
}

export default WheelSpinPage

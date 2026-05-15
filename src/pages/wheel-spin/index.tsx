import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useDidShow, useReady } from '@tarojs/taro'
import { useState, useCallback, useRef } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { History, RotateCcw, Share2 } from 'lucide-react-taro'
import type { FC } from 'react'

interface WheelItem {
  label: string
  color?: string
}

interface Wheel {
  id: number
  title: string
  items: WheelItem[]
}

const CANVAS_SIZE = 280
const CENTER = CANVAS_SIZE / 2
const RADIUS = CENTER - 10

const WheelSpinPage: FC = () => {
  const [wheel, setWheel] = useState<Wheel | null>(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState('')
  const [showResult, setShowResult] = useState(false)
  const ctxRef = useRef<any>(null)

  const drawWheel = useCallback(() => {
    if (!wheel || !ctxRef.current) return
    const ctx = ctxRef.current
    const items = wheel.items
    const count = items.length
    const anglePer = (Math.PI * 2) / count

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let i = 0; i < count; i++) {
      const startAngle = i * anglePer - Math.PI / 2
      const endAngle = (i + 1) * anglePer - Math.PI / 2

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
      ctx.rotate(startAngle + anglePer / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      const text = items[i].label.length > 6 ? items[i].label.slice(0, 6) + '...' : items[i].label
      ctx.fillText(text, RADIUS - 16, 5)
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
  }, [wheel])

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
          drawWheel()
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

  const fetchWheel = async (id: number) => {
    try {
      const res = await Network.request({ url: `/api/wheels/${id}` })
      const w = res.data?.data
      if (w) {
        setWheel(w)
        setRotation(0)
        setResult('')
        setShowResult(false)
        setTimeout(() => drawWheel(), 100)
      }
    } catch (e) {
      console.error('[WheelSpin] fetch error:', e)
    }
  }

  const handleSpin = () => {
    if (spinning || !wheel) return
    setSpinning(true)
    setShowResult(false)

    const extraSpins = 5 + Math.random() * 3
    const randomAngle = Math.random() * 360
    const targetRotation = rotation + extraSpins * 360 + randomAngle

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
        const finalAngle = (360 - (currentRot % 360)) % 360
        const index = Math.floor((finalAngle / 360) * wheel.items.length) % wheel.items.length
        const winner = wheel.items[index].label
        setResult(winner)
        setShowResult(true)
        recordHistory(winner)
      }
    }

    requestAnimationFrame(animate)
  }

  const recordHistory = async (winner: string) => {
    if (!wheel) return
    try {
      await Network.request({
        url: `/api/wheels/${wheel.id}/spin`,
        method: 'POST',
        data: { result: winner },
      })
    } catch (e) {
      console.error('[WheelSpin] record history error:', e)
    }
  }

  const handleHistory = () => {
    if (!wheel) return
    Taro.navigateTo({ url: `/pages/wheel-history/index?id=${wheel.id}` })
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
      <View className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-900">{wheel?.title || '转盘'}</Text>
      </View>

      <View className="flex flex-col items-center py-8">
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
        </View>

        {showResult && (
          <View className="mt-6 px-6 py-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <Text className="block text-sm text-gray-500 text-center">结果是</Text>
            <Text className="block text-2xl font-bold text-indigo-600 text-center mt-1">{result}</Text>
          </View>
        )}

        <View className="flex flex-row gap-3 mt-8">
          <Button
            className="px-6 py-3"
            onClick={handleSpin}
            disabled={spinning}
          >
            <RotateCcw size={18} color="#fff" />
            <Text className="text-white ml-1">{spinning ? '转动中...' : '开始转动'}</Text>
          </Button>
        </View>

        <View className="flex flex-row gap-3 mt-4">
          <View
            className="flex flex-row items-center gap-1 px-4 py-2 rounded-lg bg-white border border-gray-200"
            onClick={handleHistory}
          >
            <History size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">历史记录</Text>
          </View>
          <View
            className="flex flex-row items-center gap-1 px-4 py-2 rounded-lg bg-white border border-gray-200"
            onClick={handleShare}
          >
            <Share2 size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">分享</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default WheelSpinPage

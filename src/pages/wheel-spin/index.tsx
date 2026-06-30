// eslint-disable-next-line no-restricted-syntax -- 小程序分享必须使用原生 Button openType="share"
import { View, Text, Canvas, ScrollView, Button as TaroButton } from '@tarojs/components'
import Taro, { useDidShow, useReady, useShareAppMessage } from '@tarojs/taro'
import { useState, useCallback, useRef } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { RotateCcw, Share2, Bookmark, BookmarkCheck } from 'lucide-react-taro'
import type { FC } from 'react'

interface ProbWheelItem {
  label: string
  probability: number
  color?: string
  weight?: number
}

interface InvWheelItem {
  label: string
  count: number
  inventory?: number
  weight?: number
  color?: string
}

type WheelItem = ProbWheelItem | InvWheelItem

interface Wheel {
  id: number
  title: string
  type: 'probability' | 'inventory'
  items: WheelItem[]
  is_owner?: boolean
  is_favorited?: boolean
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
  const [isFavorited, setIsFavorited] = useState(false)
  const [isOwner, setIsOwner] = useState(true)
  const ctxRef = useRef<any>(null)
  const wheelRef = useRef<Wheel | null>(null)
  // 存储当前 Canvas 绘制时使用的扇区角度，确保转动计算与视觉一致
  const sectorAnglesRef = useRef<{ startDeg: number; endDeg: number }[]>([])

  const getUserId = (): number | undefined => {
    try {
      const cached = Taro.getStorageSync('userInfo')
      if (cached) {
        const user = JSON.parse(cached)
        return user.id
      }
    } catch { /* ignore */ }
    return undefined
  }

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
    // 确保小程序端分享菜单开启
    if ([Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any)) {
      Taro.showShareMenu({ withShareTicket: true })
    }
    const instance = Taro.getCurrentInstance()
    const id = instance.router?.params?.id
    if (id) {
      fetchWheel(Number(id))
    }
  })

  // 配置微信分享
  useShareAppMessage(() => {
    if (!wheel) {
      return {
        title: '数智局伴-来玩转盘吧！',
        path: `/pages/wheel-spin/index?id=0`,
      }
    }
    return {
      title: `数智局伴-来玩「${wheel.title}」转盘吧！`,
      path: `/pages/wheel-spin/index?id=${wheel.id}`,
    }
  })

  const fetchWheel = async (id: number, resetResult = true) => {
    try {
      const userId = getUserId()
      const [wheelRes, historyRes] = await Promise.all([
        Network.request({ url: userId ? `/api/wheels/${id}?user_id=${userId}` : `/api/wheels/${id}` }),
        Network.request({ url: `/api/wheels/${id}/history` }),
      ])
      const w = wheelRes.data?.data
      if (w) {
        wheelRef.current = w
        setWheel(w)
        setIsOwner(w.is_owner !== false)
        setIsFavorited(!!w.is_favorited)
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
        total += ((item as InvWheelItem).inventory || 0)
      } else {
        total += ((item as ProbWheelItem).weight || 1)
      }
    }
    if (total === 0) total = items.length

    const angles: { startDeg: number; endDeg: number }[] = []
    let currentDeg = 0
    for (const item of items) {
      const value = w.type === 'inventory' ? ((item as InvWheelItem).inventory || 0) : ((item as ProbWheelItem).weight || 1)
      const deg = (value / total) * 360
      angles.push({ startDeg: currentDeg, endDeg: currentDeg + deg })
      currentDeg += deg
    }
    return angles
  }

  const handleSpin = async () => {
    if (spinning || !wheel) return
    
    // 检查登录状态
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    setSpinning(true)

    // 归一化累积角度并按最新数据重绘，让上一次转动后的库存变化反映到扇区，
    // 同时刷新 sectorAnglesRef 供本次落点计算使用。此处 setSpinning(true) 与 setRotation 同帧 flush，
    // transition 切为 'none'，rotation 跳变不会产生可见回弹。
    const normalizedRotation = rotation % 360
    if (normalizedRotation !== rotation) {
      setRotation(normalizedRotation)
    }
    drawWheel()

    let winnerIndex = 0
    let winnerLabel = ''

    try {
      const res = await Network.request({
        url: `/api/wheels/${wheel.id}/spin`,
        method: 'POST',
      })
      console.log('[WheelSpin] spin result:', res.data)
      const spinData = res.data?.data
      
      if (!spinData || typeof spinData.index !== 'number') {
        Taro.showToast({ title: '转动失败：无效结果', icon: 'none' })
        setSpinning(false)
        return
      }
      
      winnerIndex = spinData.index
      winnerLabel = spinData.result || ''
    } catch (e) {
      console.error('[WheelSpin] spin error:', e)
      Taro.showToast({ title: '转动失败，请重试', icon: 'none' })
      setSpinning(false)
      return
    }

    // 使用当前 Canvas 绘制时的扇区角度（而非最新的 wheel 数据），
    // 避免库存转盘二次转动时数据已更新但 Canvas 未重绘导致角度不匹配
    const angles = sectorAnglesRef.current.length > 0 ? sectorAnglesRef.current : getSectorAngles(wheel)
    const winnerSector = angles[winnerIndex]
    const targetAngle = winnerSector.startDeg + (winnerSector.endDeg - winnerSector.startDeg) / 2
    console.log('[WheelSpin] winnerIndex:', winnerIndex, 'winnerLabel:', winnerLabel, 'targetAngle:', targetAngle, 'angles:', JSON.stringify(angles))
    const extraSpins = 5 + Math.floor(Math.random() * 4)
    const currentRotation = normalizedRotation
    // getSectorAngles 的 0° 对应屏幕上方（指针位置），因为 Canvas 绘制时减了 π/2
    // CSS rotate(R) 顺时针旋转 R 度后，指针指向原始角度 (360 - R%360) % 360
    // 要让指针指向 targetAngle：(360 - R%360) % 360 = targetAngle
    // => R%360 = (360 - targetAngle) % 360
    const desiredRotation = (360 - targetAngle + 360) % 360
    let delta = (desiredRotation - currentRotation + 360) % 360
    if (delta === 0) delta = 360
    const targetRotation = normalizedRotation + extraSpins * 360 + delta

    const startTime = Date.now()
    const duration = 3000
    const startRot = normalizedRotation

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
              // 此处刻意不重绘：当前 transform 是大数（累积旋转角度），
              // 直接重绘会让指针停留位置在新扇区布局下不再对应中奖项。
              // 重绘推迟到下一次 handleSpin 开头：那时 rotation 已归一化，且 spinning=true，
              // transition: none 可吞掉视觉跳变。
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

  const handleFavorite = async () => {
    const userId = getUserId()
    const token = Taro.getStorageSync('token')
    if (!userId || !token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!wheel) return

    try {
      if (isFavorited) {
        await Network.request({
          url: `/api/wheels/${wheel.id}/favorite?user_id=${userId}`,
          method: 'DELETE',
        })
        setIsFavorited(false)
        Taro.showToast({ title: '已取消收藏', icon: 'success' })
      } else {
        await Network.request({
          url: `/api/wheels/${wheel.id}/favorite`,
          method: 'POST',
          data: { user_id: userId },
        })
        setIsFavorited(true)
        Taro.showToast({ title: '已收藏', icon: 'success' })
      }
    } catch (e) {
      console.error('[WheelSpin] favorite error:', e)
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  return (
    <View className="flex flex-col min-h-screen bg-background" style={{ overflowX: 'hidden' }}>
      <View className="px-5 pt-2 pb-2 bg-white border-b border-gray-100">
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-2">
            <Text className="text-lg font-bold text-gray-900">{wheel?.title || '转盘'}</Text>
            {!isOwner && (
              <View className="px-2 py-1 rounded-full bg-amber-50">
                <Text className="text-xs font-medium text-amber-600">收藏</Text>
              </View>
            )}
          </View>
          <View className="flex flex-row items-center gap-2">
            {/* 收藏按钮 */}
            <View
              className="flex flex-row items-center justify-center w-9 h-9 rounded-full active:bg-gray-200"
              style={{ backgroundColor: isFavorited ? '#FEF3C7' : '#F3F4F6' }}
              onClick={handleFavorite}
            >
              {isFavorited ? (
                <BookmarkCheck size={18} color="#D97706" />
              ) : (
                <Bookmark size={18} color="#6B7280" />
              )}
            </View>
            {/* 分享按钮 - 小程序使用 openType="share" 直接触发转发，H5 复制链接 */}
            {[Taro.ENV_TYPE.WEAPP, Taro.ENV_TYPE.TT].includes(Taro.getEnv() as any) ? (
              <TaroButton
                openType="share"
                className="flex flex-row items-center justify-center w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200"
                style={{ padding: 0, margin: 0, lineHeight: 1, border: 'none', background: '#F3F4F6' }}
              >
                <Share2 size={18} color="#6B7280" />
              </TaroButton>
            ) : (
              <View
                className="flex flex-row items-center justify-center w-9 h-9 rounded-full bg-gray-100 active:bg-gray-200"
                onClick={() => {
                  if (!wheel) return
                  const url = `${window.location.origin}/pages/wheel-spin/index?id=${wheel.id}`
                  Taro.setClipboardData({
                    data: url,
                    success: () => {
                      Taro.showToast({ title: '链接已复制', icon: 'success' })
                    },
                  })
                }}
              >
                <Share2 size={18} color="#6B7280" />
              </View>
            )}
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
                      style={{ color: ((item as InvWheelItem).inventory || 0) === 0 ? '#EF4444' : '#166534' }}
                    >
                      {(item as InvWheelItem).inventory || 0}
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
          <View className="flex flex-col flex-shrink-0 px-5 pt-2 pb-4 h-72">
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

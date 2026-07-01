import { View, Text, Image, ScrollView, Button as NativeBtn } from '@tarojs/components' // eslint-disable-line no-restricted-syntax
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useState } from 'react'
import { Network } from '@/network'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Trophy, Clock, Share2, Medal, Crown, Camera, User
} from 'lucide-react-taro'
import type { FC } from 'react'

interface Photo {
  id: number
  session_id: number
  url: string
  file_key: string
  caption?: string
  created_at: string
}

interface Game {
  id: number
  name: string
  min_players: number
  max_players: number
  rules?: string
  tips?: string[]
  icon_bg?: string
  hero_bg?: string
  scoring_config?: Record<string, unknown>
}

interface SessionData {
  id: number
  session_name: string
  game_id: number | null
  game?: Game
  status: string
  players: string[]
  winner: string | null
  scoring_snapshot: PlayerData[] | null
  duration: number | null
  created_at: string
}

interface PlayerData {
  name: string
  score: number
  faction?: string
}

const PosterPage: FC = () => {
  const [session, setSession] = useState<SessionData | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useDidShow(() => {
    const instance = Taro.getCurrentInstance()
    const sessionId = instance?.router?.params?.sessionId
    if (sessionId) {
      loadData(Number(sessionId))
    } else {
      setError('缺少对局信息')
      setLoading(false)
    }
  })

  // 配置分享
  useShareAppMessage(() => {
    return {
      title: `${session?.game?.name || '桌游'} 对局精彩回顾`,
      path: `/pages/poster/index?sessionId=${session?.id}`,
    }
  })

  const loadData = async (sid: number) => {
    try {
      const [sessionRes, photosRes] = await Promise.all([
        Network.request({ url: `/api/sessions/${sid}` }),
        Network.request({ url: `/api/sessions/${sid}/photos` }),
      ])
      console.log('[PosterPage] session response:', sessionRes.data)
      console.log('[PosterPage] photos response:', photosRes.data)
      const sessionData = sessionRes.data?.data
      const photosData = photosRes.data?.data

      if (sessionData) {
        setSession(sessionData)
      } else {
        setError('获取对局信息失败')
      }
      if (Array.isArray(photosData)) {
        setPhotos(photosData)
      }
    } catch (err) {
      console.error('[PosterPage] loadData error:', err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins < 60) return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
    const hours = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hours}小时${remainMins}分` : `${hours}小时`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
  }

  const sortedPlayers: PlayerData[] = session?.scoring_snapshot
    ? [...session.scoring_snapshot].sort((a, b) => b.score - a.score)
    : session?.players
      ? session.players.map((name) => ({ name, score: 0 }))
      : []

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-50 to-purple-50">
        <View className="flex flex-col items-center gap-4">
          <View className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
          <Text className="block text-sm text-gray-500">加载对局数据...</Text>
        </View>
      </View>
    )
  }

  if (error || !session) {
    return (
      <View className="flex items-center justify-center h-screen bg-gray-50">
        <View className="flex flex-col items-center gap-3 p-8">
          <Text className="block text-lg text-gray-400">{error || '数据加载失败'}</Text>
          <Button variant="outline" onClick={() => Taro.navigateBack()}>
            <Text>返回</Text>
          </Button>
        </View>
      </View>
    )
  }

  const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null
  const gameName = session.game?.name || session.session_name || '桌游对局'
  const duration = session.duration ? formatDuration(session.duration) : '--'
  const hasPhotos = photos.length > 0

  return (
    <View className="h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      <ScrollView className="h-full" scrollY>
      {/* 海报主体 */}
      <View className="px-4 pt-4 pb-12">
        <Card className="shadow-xl overflow-hidden rounded-2xl border-0">
          {/* 头部横幅 */}
          <View
            className="flex flex-col items-center px-6 pt-8 pb-6"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
          >
            <View className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Crown size={32} color="#fbbf24" />
            </View>
            <Text className="block text-xl font-bold text-white text-center">{gameName}</Text>
            {winner && (
              <View className="flex flex-row items-center gap-1 mt-2 rounded-full px-4 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <Medal size={14} color="#fbbf24" />
                <Text className="block text-sm text-yellow-200 font-medium">{winner.name} · {winner.score}分</Text>
              </View>
            )}
          </View>

          <CardContent className="p-6 bg-white">
            {/* 对局信息 */}
            <View className="flex flex-row justify-around mb-6">
              <View className="flex flex-col items-center">
                <Clock size={18} color="#6366f1" />
                <Text className="block text-xs text-gray-400 mt-1">用时</Text>
                <Text className="block text-sm font-semibold text-gray-700">{duration}</Text>
              </View>
              <View className="flex flex-col items-center">
                <Camera size={18} color="#6366f1" />
                <Text className="block text-xs text-gray-400 mt-1">精彩瞬间</Text>
                <Text className="block text-sm font-semibold text-gray-700">{photos.length}张</Text>
              </View>
              <View className="flex flex-col items-center">
                <User size={18} color="#6366f1" />
                <Text className="block text-xs text-gray-400 mt-1">玩家</Text>
                <Text className="block text-sm font-semibold text-gray-700">{sortedPlayers.length}人</Text>
              </View>
            </View>

            {/* 分隔线 */}
            <View className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />

            {/* 排行榜 */}
            <Text className="block text-base font-bold text-gray-800 mb-3">🏆 排行榜</Text>
            <View className="flex flex-col gap-2 mb-6">
              {sortedPlayers.map((player, index) => (
                <View
                  key={index}
                  className="flex flex-row items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor:
                      index === 0
                        ? 'rgb(254,243,199)'
                        : index === 1
                          ? 'rgb(249,250,251)'
                          : index === 2
                            ? 'rgba(255,247,237,0.5)'
                            : 'rgba(249,250,251,0.5)',
                    borderWidth: index < 3 ? 1 : 0,
                    borderColor:
                      index === 0
                        ? 'rgb(253,230,138)'
                        : index === 1
                          ? 'rgb(229,231,235)'
                          : index === 2
                            ? 'rgb(254,215,170)'
                            : 'transparent',
                  }}
                >
                  <View className="flex flex-row items-center gap-3">
                    {index === 0 ? (
                      <Trophy size={20} color="#eab308" />
                    ) : index === 1 ? (
                      <Medal size={20} color="#9ca3af" />
                    ) : index === 2 ? (
                      <Medal size={20} color="#d97706" />
                    ) : (
                      <View className="w-5 flex items-center justify-center">
                        <Text className="block text-xs font-bold text-gray-400">{index + 1}</Text>
                      </View>
                    )}
                    <Text
                      className={`block text-sm ${
                        index === 0 ? 'font-bold text-amber-800' : 'font-medium text-gray-700'
                      }`}
                    >
                      {player.name}
                    </Text>
                  </View>
                  <View className="flex flex-row items-center gap-1">
                    <Text
                      className={`block text-sm font-bold ${
                        index === 0 ? 'text-amber-600' : 'text-gray-600'
                      }`}
                    >
                      {player.score}
                    </Text>
                    <Text className="block text-xs text-gray-400">分</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 精彩瞬间照片墙 */}
            {hasPhotos && (
              <>
                <Text className="block text-base font-bold text-gray-800 mb-3">📸 精彩瞬间</Text>
                <View className="grid grid-cols-3 gap-2 mb-4">
                  {photos.slice(0, 9).map((photo) => (
                    <View
                      key={photo.id}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                      onClick={() => {
                        Taro.previewImage({
                          current: photo.url,
                          urls: photos.map((p) => p.url),
                        })
                      }}
                    >
                      <Image
                        src={photo.url}
                        className="w-full h-full"
                        mode="aspectFill"
                      />
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 底部信息 */}
            <View className="flex flex-col items-center pt-4 border-t border-gray-100">
              <Text className="block text-xs text-gray-400">{formatDate(session.created_at)}</Text>
              <Text className="block text-xs text-gray-300 mt-1">数智局伴 · 精彩对局记录</Text>
            </View>
          </CardContent>
        </Card>

        {/* 分享按钮 - 使用原生Button openType="share" */}
        <View className="relative w-full rounded-xl mt-6" style={{ height: '44px' }}>
          {/* eslint-disable-next-line no-restricted-syntax */}
          <NativeBtn openType="share" className="absolute inset-0 w-full h-full opacity-0 z-10" />
          <View
            className="absolute inset-0 w-full h-full flex flex-row items-center justify-center gap-2 rounded-xl pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Share2 size={18} color="#fff" />
            <Text className="text-white font-medium text-sm">分享给好友</Text>
          </View>
        </View>
      </View>
    </ScrollView>
    </View>
  )
}

export default PosterPage
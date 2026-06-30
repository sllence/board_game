import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useShare } from '@/hooks/useShare'
import { ArrowLeft, MessageSquare, Trophy, Wrench, Lightbulb } from 'lucide-react-taro'
import { Network } from '@/network'

interface Feedback {
  id: number
  user_id: number
  feedback_type: string
  content: string
  images?: string[]
  created_at: string
  nickname?: string
}

const typeMap: Record<string, { label: string, color: string, bg: string }> = {
  'bug_report': { label: '问题反馈', color: '#ef4444', bg: 'bg-red-100' },
  'new_game': { label: '新增桌游', color: '#9333ea', bg: 'bg-purple-100' },
  'new_tool': { label: '新增工具', color: '#eab308', bg: 'bg-yellow-100' },
  'suggestion': { label: '优化建议', color: '#22c55e', bg: 'bg-green-100' },
}

const feedbackTabs = [
  { id: 'all', label: '全部' },
  { id: 'bug_report', label: '问题反馈' },
  { id: 'new_game', label: '新增桌游' },
  { id: 'new_tool', label: '新增工具' },
  { id: 'suggestion', label: '优化建议' },
]

export default function FeedbackAdminPage() {
  useShare('反馈管理')
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const cachedUserInfo = Taro.getStorageSync('userInfo')
  const token = Taro.getStorageSync('token')
  const userInfo = cachedUserInfo ? (typeof cachedUserInfo === 'string' ? JSON.parse(cachedUserInfo) : cachedUserInfo) : null
  const isAdmin = userInfo?.is_admin === true && !!token

  const handleBack = () => {
    Taro.navigateBack()
  }

  const loadFeedbacks = async () => {
    setLoading(true)
    try {
      const url = activeTab === 'all'
        ? '/api/feedbacks'
        : `/api/feedbacks?feedback_type=${activeTab}`

      console.log('请求反馈列表:', url)
      const res = await Network.request({ url, method: 'GET' })
      console.log('获取反馈列表返回:', res.data)

      if (res.data?.success && Array.isArray(res.data.data)) {
        // 映射后端字段名到前端字段名
        const mappedFeedbacks = res.data.data.map((item: Record<string, unknown>) => ({
          id: item.id,
          user_id: item.user_id,
          feedback_type: item.feedback_type || item.type,
          content: item.content,
          images: item.images || [],
          created_at: item.created_at,
          nickname: item.nickname || '匿名用户',
        }))
        setFeedbacks(mappedFeedbacks)
      } else {
        setFeedbacks([])
      }
    } catch (err) {
      console.error('加载反馈失败', err)
      setFeedbacks([])
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (isAdmin) {
      loadFeedbacks()
    } else {
      Taro.showToast({ title: '您没有权限访问', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  useEffect(() => {
    if (isAdmin) {
      loadFeedbacks()
    }
  }, [activeTab])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_report': return MessageSquare
      case 'new_game': return Trophy
      case 'new_tool': return Wrench
      case 'suggestion': return Lightbulb
      default: return MessageSquare
    }
  }

  if (!isAdmin) return null

  return (
    <View className="flex flex-col min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <View className="sticky top-0 z-30 bg-white border-b border-border">
        <View className="flex items-center h-14 px-4">
          <Button variant="ghost" className="p-2 -ml-2" onClick={handleBack}>
            <ArrowLeft size={24} color="#71717a" />
          </Button>
          <Text className="block text-base font-semibold text-on-surface ml-2">反馈管理</Text>
        </View>
      </View>

      {/* 筛选栏 */}
      <View className="sticky top-14 z-20 bg-white px-4 py-3 border-b border-border">
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <ScrollView scrollX className="w-full">
            <TabsList className="inline-flex">
              {feedbackTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollView>
        </Tabs>
      </View>

      <View className="flex-1 p-4">
        {loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white">
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-24 mb-3" />
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-5 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </View>
        ) : feedbacks.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-12">
            <MessageSquare size={48} color="#a1a1aa" />
            <Text className="block text-muted-foreground mt-2">暂无反馈</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {feedbacks.map((feedback) => {
              const typeInfo = typeMap[feedback.feedback_type] || { label: '其他', color: '#71717a', bg: 'bg-gray-100' }
              const Icon = getTypeIcon(feedback.feedback_type)
              const isExpanded = expandedId === feedback.id

              return (
                <Card
                  key={feedback.id}
                  className={`bg-white cursor-pointer ${isExpanded ? 'border-l-4 border-primary' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : feedback.id)}
                >
                  <CardContent className="p-4">
                    <View className="flex items-start justify-between mb-3">
                      <View className="flex items-center gap-2">
                        <View className={`w-8 h-8 ${typeInfo.bg} rounded-full flex items-center justify-center`}>
                          <Icon size={18} color={typeInfo.color} />
                        </View>
                        <Badge className={typeInfo.bg} style={{ color: typeInfo.color }}>
                          {typeInfo.label}
                        </Badge>
                      </View>
                      <Text className="block text-xs text-muted-foreground">
                        {formatDate(feedback.created_at)}
                      </Text>
                    </View>

                    <Text className="block text-sm text-on-surface mb-2">
                      {isExpanded ? feedback.content : (
                        feedback.content.length > 50 ? feedback.content.slice(0, 50) + '...' : feedback.content
                      )}
                    </Text>

                    {feedback.images && feedback.images.length > 0 && isExpanded && (
                      <View className="flex flex-wrap gap-2 mt-3">
                        {feedback.images.map((img, i) => (
                          <Image key={i} src={img} className="w-20 h-20 rounded-lg" mode="aspectFill" />
                        ))}
                      </View>
                    )}

                    {feedback.nickname && (
                      <Text className="block text-xs text-muted-foreground mt-2">
                        提交者：{feedback.nickname}
                      </Text>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

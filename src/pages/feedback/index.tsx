import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useShare } from '@/hooks/useShare'
import { ArrowLeft, MessageSquare, Trophy, Wrench, Lightbulb, Upload, X, Check } from 'lucide-react-taro'
import { Network } from '@/network'

interface UserInfo {
  id: number
  nickname?: string
  avatar_url?: string
}

const feedbackTypes = [
  { id: 'bug', label: '问题反馈', icon: MessageSquare, color: '#ef4444', bg: 'bg-red-100' },
  { id: 'game', label: '新增桌游', icon: Trophy, color: '#9333ea', bg: 'bg-purple-100' },
  { id: 'tool', label: '新增工具', icon: Wrench, color: '#eab308', bg: 'bg-yellow-100' },
  { id: 'suggest', label: '优化建议', icon: Lightbulb, color: '#22c55e', bg: 'bg-green-100' },
]

const typeMap: Record<string, string> = {
  'bug': 'bug_report',
  'game': 'new_game',
  'tool': 'new_tool',
  'suggest': 'suggestion',
}

export default function FeedbackPage() {
  useShare()
  const [selectedType, setSelectedType] = useState<string>('bug')
  const [content, setContent] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleChooseImage = () => {
    if (uploadedImages.length >= 3) {
      Taro.showToast({ title: '最多上传3张', icon: 'none' })
      return
    }
    Taro.chooseImage({
      count: 3 - uploadedImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths
        const uploadedUrls: string[] = []

        for (const filePath of tempFilePaths) {
          try {
            const uploadRes = await Network.uploadFile({
              url: '/api/upload',
              filePath,
              name: 'file',
            })
            if (uploadRes.data) {
              const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
              const url = data?.data?.url
              if (url) {
                uploadedUrls.push(url)
              }
            }
          } catch (err) {
            console.error('上传图片失败', err)
            Taro.showToast({ title: '图片上传失败', icon: 'none' })
          }
        }

        setUploadedImages([...uploadedImages, ...uploadedUrls])
      },
    })
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }

    const cachedUser = Taro.getStorageSync('userInfo')
    const token = Taro.getStorageSync('token')
    let user: UserInfo | null = null
    if (cachedUser) {
      try {
        user = JSON.parse(cachedUser)
      } catch {
        // ignore
      }
    }

    if (!user?.id || !token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await Network.request({
        url: '/api/feedbacks',
        method: 'POST',
        data: {
          user_id: user.id,
          feedback_type: typeMap[selectedType],
          content,
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
          nickname: user.nickname || '匿名用户',
        },
      })

      console.log('提交反馈返回:', res.data)

      const localFeedbacks = Taro.getStorageSync('localFeedbacks') || []
      const newFeedback = {
        id: Date.now(),
        user_id: user.id,
        feedback_type: typeMap[selectedType],
        content,
        images: uploadedImages.length > 0 ? uploadedImages : [],
        created_at: new Date().toISOString(),
        nickname: user.nickname || '用户',
      }
      Taro.setStorageSync('localFeedbacks', [newFeedback, ...localFeedbacks])

      if (res.data?.success) {
        setShowSuccess(true)
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        setShowSuccess(true)
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('提交反馈异常', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <View className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={48} color="#22c55e" />
        </View>
        <Text className="block text-lg font-semibold text-on-surface mb-2">提交成功</Text>
        <Text className="block text-sm text-muted-foreground text-center">感谢您的反馈！</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col min-h-screen bg-background">
      <View className="sticky top-0 z-30 bg-white border-b border-border">
        <View className="flex items-center h-14 px-4">
          <Button variant="ghost" className="p-2 -ml-2" onClick={handleBack}>
            <ArrowLeft size={24} color="#71717a" />
          </Button>
          <Text className="block text-base font-semibold text-on-surface ml-2">问题反馈</Text>
        </View>
      </View>

      <View className="flex-1 p-4 pb-32">
        <Text className="block text-sm font-medium text-on-surface mb-3">反馈类型</Text>
        <View className="grid grid-cols-2 gap-3 mb-6">
          {feedbackTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            return (
              <Card
                key={type.id}
                className={`cursor-pointer border-2 transition-all ${isSelected ? 'border-primary bg-primary' : 'border-transparent bg-white'}`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardContent className="p-4 flex flex-col items-center">
                  <View className={`w-12 h-12 ${type.bg} rounded-full flex items-center justify-center mb-2 ${isSelected ? 'bg-white' : ''}`}>
                    <Icon size={24} color={isSelected ? '#4F46E5' : type.color} />
                  </View>
                  <Text className={`block text-sm font-medium ${isSelected ? 'text-white' : 'text-black'}`}>{type.label}</Text>
                  {isSelected && (
                    <View className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <Check size={14} color="#4F46E5" />
                    </View>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </View>

        <Text className="block text-sm font-medium text-on-surface mb-3">反馈内容 *</Text>
        <Textarea
          className="mb-6"
          placeholder="请详细描述您的反馈..."
          value={content}
          onInput={(e) => setContent((e.target as any).value)}
          maxlength={500}
        />

        <Text className="block text-sm font-medium text-on-surface mb-3">上传图片（可选，最多3张）</Text>
        <View className="flex flex-wrap gap-3">
          {uploadedImages.map((img, index) => (
            <View key={index} className="relative">
              <Image src={img} className="w-24 h-24 rounded-lg object-cover" mode="aspectFill" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full"
                onClick={() => handleRemoveImage(index)}
              >
                <X size={14} color="#ffffff" />
              </Button>
            </View>
          ))}
          {uploadedImages.length < 3 && (
            <Card
              className="w-24 h-24 border-dashed border-2 border-border flex items-center justify-center cursor-pointer bg-white"
              onClick={handleChooseImage}
            >
              <CardContent className="p-4 flex flex-col items-center">
                <Upload size={28} color="#71717a" />
                <Text className="block text-xs text-muted-foreground">添加图片</Text>
              </CardContent>
            </Card>
          )}
        </View>
      </View>

      <View
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          zIndex: 100,
        }}
      >
        <Button
          className="w-full bg-primary text-white"
          disabled={!content.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          <Text className="block">{isSubmitting ? '提交中...' : '提交反馈'}</Text>
        </Button>
      </View>
    </View>
  )
}

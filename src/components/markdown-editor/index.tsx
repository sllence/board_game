import { View, Text, Textarea, RichText } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Eye, EyeOff } from 'lucide-react-taro'
import { Network } from '@/network'
import { markdownToRichText } from '@/lib/markdown'
import type { FC } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '支持 Markdown 语法...',
  minHeight = 200,
}) => {
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleUploadImage = async () => {
    try {
      setUploading(true)
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })

      if (!res.tempFilePaths || res.tempFilePaths.length === 0) {
        return
      }

      const uploadRes = await Network.uploadFile({
        url: '/api/upload',
        filePath: res.tempFilePaths[0],
        name: 'file',
        header: {
          'Authorization': `Bearer ${Taro.getStorageSync('token') || ''}`,
        },
      })

      const data = JSON.parse(uploadRes.data)
      const imageUrl = data.data?.url || data.url || ''

      if (imageUrl) {
        // 在光标位置插入 Markdown 图片语法
        const markdownImage = `\n![图片](${imageUrl})\n`
        onChange(value + markdownImage)
        Taro.showToast({ title: '图片已插入', icon: 'success' })
      }
    } catch (error) {
      console.error('[MarkdownEditor] Upload error:', error)
      Taro.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <View className="w-full mb-5">
      <View className="flex items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-700">规则内容</Text>
        <View className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUploadImage}
            disabled={uploading}
          >
            <Upload size={14} color="inherit" />
            <Text className="text-xs">{uploading ? '上传中...' : '插入图片'}</Text>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff size={14} color="inherit" /> : <Eye size={14} color="inherit" />}
            <Text className="text-xs">{showPreview ? '编辑' : '预览'}</Text>
          </Button>
        </View>
      </View>

      <View className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
        {!showPreview ? (
          <Textarea
            className="w-full bg-transparent p-3"
            style={{ minHeight: `${minHeight}px`, height: `${minHeight}px`, display: 'block' }}
            value={value}
            onInput={(e) => onChange(e.detail.value)}
            placeholder={placeholder}
            maxlength={-1}
          />
        ) : (
          <View className="p-4">
            {value
              ? <RichText nodes={markdownToRichText(value)} />
              : <Text className="text-sm text-gray-400">暂无内容</Text>
            }
          </View>
        )}
      </View>

      <Text className="block mt-2 text-xs text-gray-500">
        支持 Markdown 语法：**粗体**、*斜体*、# 标题、- 列表等
      </Text>
    </View>
  )
}

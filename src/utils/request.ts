import Taro from '@tarojs/taro'
import { Network } from '@/network'

interface ApiResponse<T = unknown> {
  code?: number
  msg?: string
  data?: T
  success?: boolean
  access_token?: string
}

interface UploadResponse {
  data?: string | Record<string, unknown>
}

function unwrapData<T>(res: { data?: ApiResponse<T> }): T | undefined {
  return res.data?.data
}

function parseUploadData(uploadRes: UploadResponse): Record<string, unknown> {
  const raw = uploadRes.data
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (raw && typeof raw === 'object') {
    return raw
  }
  return {}
}

function extractUploadUrl(uploadData: Record<string, unknown>): string {
  const nested = uploadData.data as Record<string, unknown> | undefined
  return (
    (nested?.avatar_url as string) ||
    (nested?.url as string) ||
    (uploadData.avatar_url as string) ||
    (uploadData.url as string) ||
    ''
  )
}

function handleAuthError() {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
  Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
  setTimeout(() => {
    Taro.switchTab({ url: '/pages/profile/index' })
  }, 1500)
}

export async function apiGet<T>(url: string, params?: Record<string, string>): Promise<T> {
  const queryStr = params ? new URLSearchParams(params).toString() : ''
  const fullUrl = queryStr ? `${url}?${queryStr}` : url
  const res = await Network.request({ url: fullUrl })
  if (res.statusCode === 401) {
    handleAuthError()
    throw new Error('Unauthorized')
  }
  return unwrapData<T>(res) as T
}

export async function apiPost<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  const res = await Network.request({ url, method: 'POST', data })
  if (res.statusCode === 401) {
    handleAuthError()
    throw new Error('Unauthorized')
  }
  return unwrapData<T>(res) as T
}

export async function apiPut<T>(url: string, data?: Record<string, unknown>): Promise<T> {
  const res = await Network.request({ url, method: 'PUT', data })
  if (res.statusCode === 401) {
    handleAuthError()
    throw new Error('Unauthorized')
  }
  return unwrapData<T>(res) as T
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await Network.request({ url, method: 'DELETE' })
  if (res.statusCode === 401) {
    handleAuthError()
    throw new Error('Unauthorized')
  }
  return unwrapData<T>(res) as T
}

export async function apiUpload<T>(
  url: string,
  filePath: string,
  name: string,
  formData?: Record<string, string>,
): Promise<T> {
  const uploadRes = await Network.uploadFile({ url, filePath, name, formData }) as UploadResponse
  const parsed = parseUploadData(uploadRes)
  return parsed as T
}

export function extractUploadUrlFromResponse(uploadRes: UploadResponse): string {
  const parsed = parseUploadData(uploadRes)
  return extractUploadUrl(parsed)
}

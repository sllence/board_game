import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class AuthService {
  async login(code: string, platform: string) {
    // 在开发环境中，用 code 模拟登录（实际生产环境需调用微信/抖音 code2Session）
    const client = getSupabaseClient()
    const openidField = platform === 'weapp' ? 'openid' : 'tt_openid'
    const mockOpenid = `dev_${platform}_${code}`

    // 查找或创建用户
    const { data: existingUser } = await client
      .from('users')
      .select('*')
      .eq(openidField, mockOpenid)
      .maybeSingle()

    if (existingUser) {
      return { data: existingUser }
    }

    // 创建新用户
    const { data: newUser, error } = await client
      .from('users')
      .insert({
        [openidField]: mockOpenid,
        platform,
        nickname: `玩家${Date.now().toString().slice(-4)}`,
      })
      .select()
      .maybeSingle()

    if (error) throw new Error(`登录失败: ${error.message}`)
    return { data: newUser }
  }

  async getProfile(userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(`获取用户信息失败: ${error.message}`)
    return { data }
  }

  async updateProfile(body: { user_id: number; nickname?: string; avatar_url?: string }) {
    const client = getSupabaseClient()
    const updateData: any = {}
    if (body.nickname) updateData.nickname = body.nickname
    if (body.avatar_url) updateData.avatar_url = body.avatar_url
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', body.user_id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`更新用户信息失败: ${error.message}`)
    return { data }
  }
}

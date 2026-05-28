import { Injectable, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * 微信小程序 code2Session
   * 调用微信服务端 API，用 code 换取 openid 和 session_key
   */
  private async code2Session(code: string): Promise<{ openid: string; session_key: string }> {
    const appid = process.env.WX_APPID || ''
    const secret = process.env.WX_SECRET || ''

    if (!appid || !secret) {
      // 开发环境：没有配置微信密钥时，使用模拟 openid
      console.log('[AuthService] WX_APPID/WX_SECRET not configured, using mock openid')
      return { openid: `dev_weapp_${code}`, session_key: 'mock_session_key' }
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
    console.log('[AuthService] code2Session request, appid:', appid)

    const response = await fetch(url)
    const data = await response.json()
    console.log('[AuthService] code2Session response errcode:', data.errcode)

    if (data.errcode) {
      console.log('[AuthService] WeChat code2Session error:', data.errcode, data.errmsg)
      throw new BadRequestException(`微信登录失败: ${data.errmsg || '无效的登录凭证'}`)
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
    }
  }

  /**
   * 抖音小程序 code2Session
   */
  private async ttCode2Session(code: string): Promise<{ openid: string }> {
    const appid = process.env.TT_APPID || ''
    const secret = process.env.TT_SECRET || ''

    if (!appid || !secret) {
      console.log('[AuthService] TT_APPID/TT_SECRET not configured, using mock openid')
      return { openid: `dev_tt_${code}` }
    }

    const url = `https://developer.toutiao.com/api/apps/jscode2session?appid=${appid}&secret=${secret}&code=${code}`
    console.log('[AuthService] TT code2Session request, appid:', appid)

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      console.log('[AuthService] TT code2Session error:', data.error, data.message)
      throw new BadRequestException(`抖音登录失败: ${data.message || '无效的登录凭证'}`)
    }

    return { openid: data.openid }
  }

  /**
   * 生成 JWT token
   */
  private generateToken(user: any): string {
    const payload = { sub: user.id, platform: user.platform }
    return this.jwtService.sign(payload)
  }

  /**
   * 登录 / 注册
   * @param code 小程序登录 code
   * @param platform 平台：weapp / tt / h5
   * @param nickname 用户昵称（可选，来自 getUserProfile）
   * @param avatar_url 用户头像（可选，来自 getUserProfile）
   */
  async login(code: string, platform: string, nickname?: string, avatar_url?: string) {
    const client = getSupabaseClient()

    // 根据平台获取 openid
    let openid = ''
    const openidField = platform === 'weapp' ? 'openid' : 'tt_openid'

    if (platform === 'weapp') {
      const result = await this.code2Session(code)
      openid = result.openid
    } else if (platform === 'tt') {
      const result = await this.ttCode2Session(code)
      openid = result.openid
    } else {
      // H5 开发环境 - 添加简单验证码机制
      const verifyCode = code.split('_')[1] || code
      // 简单验证：code 必须包含 "h5_" 前缀
      if (!code.startsWith('h5_')) {
        throw new BadRequestException('H5 登录需要验证码')
      }
      openid = `dev_${platform}_${verifyCode}`
    }

    if (!openid) {
      throw new Error('获取 openid 失败')
    }

    console.log('[AuthService] login openid:', openid, 'platform:', platform)

    // 查找已有用户
    const { data: existingUser } = await client
      .from('users')
      .select('*')
      .eq(openidField, openid)
      .maybeSingle()

    if (existingUser) {
      // 更新头像和昵称（如果前端传了的话）
      const updateData: any = { updated_at: new Date().toISOString() }
      if (nickname) updateData.nickname = nickname
      if (avatar_url) updateData.avatar_url = avatar_url

      if (nickname || avatar_url) {
        const { data: updatedUser, error } = await client
          .from('users')
          .update(updateData)
          .eq('id', existingUser.id)
          .select()
          .maybeSingle()

        if (error) console.error('[AuthService] update user error:', error.message)
        if (updatedUser) {
          const token = this.generateToken(updatedUser)
          return { data: updatedUser, access_token: token }
        }
      }

      const token = this.generateToken(existingUser)
      return { data: existingUser, access_token: token }
    }

    // 创建新用户
    const newUserData: any = {
      [openidField]: openid,
      platform,
      nickname: nickname || (platform === 'weapp' ? '微信用户' : platform === 'tt' ? '抖音用户' : `玩家${Date.now().toString().slice(-4)}`),
    }
    if (avatar_url) newUserData.avatar_url = avatar_url

    const { data: newUser, error } = await client
      .from('users')
      .insert(newUserData)
      .select()
      .maybeSingle()

    if (error) throw new Error(`登录失败: ${error.message}`)
    console.log('[AuthService] new user created:', newUser?.id)

    const token = this.generateToken(newUser)
    return { data: newUser, access_token: token }
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

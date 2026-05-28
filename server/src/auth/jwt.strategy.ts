import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'board-game-secret-key-change-in-production',
    })
  }

  async validate(payload: any) {
    const client = getSupabaseClient()
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle()

    if (!user) {
      throw new UnauthorizedException('用户不存在')
    }

    return { userId: user.id, platform: user.platform, isAdmin: user.is_admin || false }
  }
}

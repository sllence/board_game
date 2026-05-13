import { Controller, Post, Get, Put, Body, Query } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { code: string; platform: string; nickname?: string; avatar_url?: string },
  ) {
    console.log('[AuthController] login request:', {
      code: body.code,
      platform: body.platform,
      nickname: body.nickname,
      hasAvatar: !!body.avatar_url,
    })
    return this.authService.login(body.code, body.platform, body.nickname, body.avatar_url)
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  async getProfile(@Query('user_id') userId: number) {
    return this.authService.getProfile(Number(userId))
  }

  @Put('profile')
  async updateProfile(@Body() body: { user_id: number; nickname?: string; avatar_url?: string }) {
    return this.authService.updateProfile(body)
  }
}

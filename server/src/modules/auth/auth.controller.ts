import { Controller, Post, Get, Put, Body } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { code: string; platform: string }) {
    return this.authService.login(body.code, body.platform)
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @Get('profile')
  async getProfile(@Body() body: { user_id: number }) {
    return this.authService.getProfile(body.user_id)
  }

  @Put('profile')
  async updateProfile(@Body() body: { user_id: number; nickname?: string; avatar_url?: string }) {
    return this.authService.updateProfile(body)
  }
}

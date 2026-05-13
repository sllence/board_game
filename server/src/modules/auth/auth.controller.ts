import { Controller, Post, Get, Put, Body, Query, UploadedFile, UseInterceptors, HttpCode } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { AuthService } from './auth.service'
import { StorageService } from '../storage/storage.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
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
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
  ) {}

  @Get('profile')
  async getProfile(@Query('user_id') userId: number) {
    return this.authService.getProfile(Number(userId))
  }

  @Put('profile')
  @HttpCode(200)
  async updateProfile(@Body() body: { user_id: number; nickname?: string; avatar_url?: string }) {
    console.log('[UserController] updateProfile:', { userId: body.user_id, nickname: body.nickname, hasAvatar: !!body.avatar_url })
    return this.authService.updateProfile(body)
  }

  @Post('avatar')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Body() body: { user_id: string }) {
    console.log('[UserController] uploadAvatar:', {
      userId: body.user_id,
      filename: file?.originalname,
      size: file?.size,
      hasBuffer: !!file?.buffer,
      hasPath: !!file?.path,
    })

    if (!file) {
      return { code: 400, msg: '请选择图片', data: null }
    }

    // 上传到 TOS 对象存储并获取 URL
    const avatarUrl = await this.storageService.uploadAvatar({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    })

    // 更新用户头像
    const userId = Number(body.user_id)
    await this.authService.updateProfile({ user_id: userId, avatar_url: avatarUrl })

    console.log('[AuthController] avatar uploaded:', avatarUrl)
    return { code: 200, msg: '头像上传成功', data: { avatar_url: avatarUrl } }
  }
}

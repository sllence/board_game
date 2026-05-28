import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req } from '@nestjs/common'
import { SessionsService } from './sessions.service'
import { Public } from '../../auth/decorators'
import { Request } from 'express'

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: {
    game_id: number
    session_name?: string
    players: any[]
  }) {
    const userId = (req as any).user?.userId
    return this.sessionsService.create({ ...body, user_id: userId })
  }

  @Get()
  async findAll(@Req() req: Request, @Query() query: {
    game_id?: string
    status?: string
  }) {
    const userId = (req as any).user?.userId
    return this.sessionsService.findAll({ ...query, user_id: userId?.toString() })
  }

  @Get('recent')
  async findRecent(@Req() req: Request) {
    const userId = (req as any).user?.userId
    return this.sessionsService.findRecent(userId)
  }

  @Get('favorites')
  async getFavorites(@Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.sessionsService.getFavoriteSessions(userId)
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(Number(id))
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.sessionsService.update(Number(id), body)
  }

  @Post(':id/favorite')
  async favorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.sessionsService.favoriteSession(Number(id), userId)
  }

  @Delete(':id/favorite')
  async unfavorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.sessionsService.unfavoriteSession(Number(id), userId)
  }

  @Get(':id/is-favorited')
  async isFavorited(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.sessionsService.isSessionFavorited(Number(id), userId)
  }

  @Post(':id/finish')
  async finish(
    @Param('id') id: string,
    @Body() body: { winner?: string; scoring_snapshot?: any[]; duration_seconds?: number },
  ) {
    return this.sessionsService.finish(Number(id), body.winner, body.scoring_snapshot, body.duration_seconds)
  }
}

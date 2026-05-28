import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req } from '@nestjs/common'
import { WheelService } from './wheel.service'
import { Public } from '../../auth/decorators'
import { Request } from 'express'

interface ProbWheelItem {
  label: string
  probability: number
}

interface InvWheelItem {
  label: string
  count: number
}

type WheelItem = ProbWheelItem | InvWheelItem

@Controller('wheels')
export class WheelController {
  constructor(private readonly wheelService: WheelService) {}

  @Post()
  async create(@Req() req: Request, @Body() body: {
    title: string
    type: 'probability' | 'inventory'
    items: WheelItem[]
  }) {
    const userId = (req as any).user?.userId
    return this.wheelService.create({ ...body, user_id: userId })
  }

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req as any).user?.userId
    return this.wheelService.findAll(userId)
  }

  @Get('favorites')
  async findFavorites(@Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.wheelService.findFavorites(userId)
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @Query('user_id') userId?: string) {
    return this.wheelService.findOne(Number(id), userId ? Number(userId) : undefined)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
    title?: string
    type?: 'probability' | 'inventory'
    items?: any[]
  }) {
    return this.wheelService.update(Number(id), body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.wheelService.remove(Number(id))
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    return this.wheelService.duplicate(Number(id), userId)
  }

  @Post(':id/spin')
  @Public()
  async spin(@Param('id') id: string) {
    return this.wheelService.spin(Number(id))
  }

  @Get(':id/history')
  @Public()
  async getHistory(@Param('id') id: string) {
    return this.wheelService.findHistory(Number(id))
  }

  @Post(':id/favorite')
  async favorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.wheelService.favorite(Number(id), userId)
  }

  @Delete(':id/favorite')
  async unfavorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.wheelService.unfavorite(Number(id), userId)
  }

  @Get(':id/is-favorited')
  async isFavorited(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId
    if (!userId) {
      return { code: 401, msg: '未授权', data: null }
    }
    return this.wheelService.isFavorited(Number(id), userId)
  }
}

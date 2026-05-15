import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common'
import { WheelService } from './wheel.service'

@Controller('wheels')
export class WheelController {
  constructor(private readonly wheelService: WheelService) {}

  @Post()
  async create(@Body() body: {
    user_id?: number
    title: string
    type: 'probability' | 'inventory'
    items: any[]
  }) {
    return this.wheelService.create(body)
  }

  @Get()
  async findAll(@Query('user_id') userId?: string) {
    return this.wheelService.findAll(userId ? Number(userId) : undefined)
  }

  @Get('favorites')
  async findFavorites(@Query('user_id') userId: string) {
    return this.wheelService.findFavorites(Number(userId))
  }

  @Get(':id')
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
  async duplicate(@Param('id') id: string, @Body() body?: { user_id?: number }) {
    return this.wheelService.duplicate(Number(id), body?.user_id)
  }

  @Post(':id/spin')
  async spin(@Param('id') id: string) {
    return this.wheelService.spin(Number(id))
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.wheelService.findHistory(Number(id))
  }

  @Post(':id/favorite')
  async favorite(@Param('id') id: string, @Body() body: { user_id: number }) {
    return this.wheelService.favorite(Number(id), body.user_id)
  }

  @Delete(':id/favorite')
  async unfavorite(@Param('id') id: string, @Query('user_id') userId: string) {
    return this.wheelService.unfavorite(Number(id), Number(userId))
  }

  @Get(':id/is-favorited')
  async isFavorited(@Param('id') id: string, @Query('user_id') userId: string) {
    return this.wheelService.isFavorited(Number(id), Number(userId))
  }
}

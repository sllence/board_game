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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.wheelService.findOne(Number(id))
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

  @Post(':id/spin')
  async spin(@Param('id') id: string) {
    return this.wheelService.spin(Number(id))
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.wheelService.findHistory(Number(id))
  }
}

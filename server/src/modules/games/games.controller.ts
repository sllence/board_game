import { Controller, Get, Param, Query, Post, Put, Delete, Body, Req } from '@nestjs/common'
import { GamesService } from './games.service'
import { Public, Roles } from '../../auth/decorators'
import { Request } from 'express'

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @Public()
  async findAll(@Query() query: {
    type?: string
    scene?: string
    min_players?: string
    max_players?: string
    duration?: string
    difficulty?: string
    keyword?: string
  }) {
    return this.gamesService.findAll(query)
  }

  @Get('hot')
  @Public()
  async findHot() {
    return this.gamesService.findHot(false)
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(Number(id), false)
  }

  @Post()
  @Roles('admin')
  async create(@Req() req: Request, @Body() body: any) {
    const userId = (req as any).user?.userId
    return this.gamesService.create({ ...body, created_by: userId })
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.gamesService.update(Number(id), body)
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.gamesService.delete(Number(id))
  }
}

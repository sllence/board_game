import { Controller, Get, Param, Query, Post, Put, Delete, Body } from '@nestjs/common'
import { GamesService } from './games.service'

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
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
  async findHot() {
    return this.gamesService.findHot()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(Number(id))
  }

  @Post()
  async create(@Body() body: any) {
    return this.gamesService.create(body)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.gamesService.update(Number(id), body)
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.gamesService.delete(Number(id))
  }
}

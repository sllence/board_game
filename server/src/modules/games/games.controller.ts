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
    is_admin?: string
  }) {
    return this.gamesService.findAll({
      ...query,
      is_admin: query.is_admin === 'true'
    })
  }

  @Get('hot')
  async findHot(@Query('is_admin') isAdmin?: string) {
    return this.gamesService.findHot(isAdmin === 'true')
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('is_admin') isAdmin?: string) {
    return this.gamesService.findOne(Number(id), isAdmin === 'true')
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

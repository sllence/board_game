import { Controller, Get, Param, Query } from '@nestjs/common'
import { GuidesService } from './guides.service'

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

  @Get()
  async findByGame(@Query('gameId') gameId: string) {
    return this.guidesService.findByGame(Number(gameId))
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.guidesService.findOne(Number(id))
  }
}

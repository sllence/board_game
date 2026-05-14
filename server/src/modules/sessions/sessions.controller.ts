import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common'
import { SessionsService } from './sessions.service'

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(@Body() body: {
    user_id?: number
    game_id: number
    session_name?: string
    players: any[]
  }) {
    return this.sessionsService.create(body)
  }

  @Get()
  async findAll(@Query() query: {
    user_id?: string
    game_id?: string
    status?: string
  }) {
    return this.sessionsService.findAll(query)
  }

  @Get('recent')
  async findRecent(@Query('user_id') userId?: string) {
    return this.sessionsService.findRecent(userId ? Number(userId) : undefined)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(Number(id))
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.sessionsService.update(Number(id), body)
  }

  @Post(':id/finish')
  async finish(
    @Param('id') id: string,
    @Body() body: { winner?: string; scoring_snapshot?: any[]; duration_seconds?: number },
  ) {
    return this.sessionsService.finish(Number(id), body.winner, body.scoring_snapshot, body.duration_seconds)
  }
}

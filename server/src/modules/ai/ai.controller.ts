import { Controller, Post, Body } from '@nestjs/common'
import { AiService } from './ai.service'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: { game_id: number; question: string }) {
    return this.aiService.chat(body.game_id, body.question)
  }
}

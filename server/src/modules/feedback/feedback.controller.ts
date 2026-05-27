import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common'
import { FeedbackService } from './feedback.service'

@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() body: {
    user_id: number
    feedback_type: 'bug_report' | 'new_game' | 'new_tool' | 'suggestion'
    content: string
    images?: string[]
  }) {
    return this.feedbackService.submitFeedback(body)
  }

  @Get('my')
  async findMyFeedbacks(@Query('user_id') userId: string) {
    return this.feedbackService.findByUserId(Number(userId))
  }

  @Get()
  async findAll(@Query('feedback_type') feedback_type?: string, @Query('page') page?: string, @Query('page_size') page_size?: string) {
    return this.feedbackService.findAll({ 
      feedback_type, 
      page: page ? Number(page) : 1, 
      page_size: page_size ? Number(page_size) : 20 
    })
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findById(Number(id))
  }
}

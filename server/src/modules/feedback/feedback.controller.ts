import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common'
import { FeedbackService, FeedbackType } from './feedback.service'

@Controller('feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() body: {
    user_id: number
    feedback_type: FeedbackType
    content: string
    images?: string[]
  }) {
    return this.feedbackService.submitFeedback(
      body.user_id,
      body.feedback_type,
      body.content,
      body.images || [],
    )
  }

  @Get('my')
  async findMyFeedbacks(
    @Query('user_id') userId: string,
    @Query('feedback_type') feedback_type?: FeedbackType,
  ) {
    return this.feedbackService.findMyFeedbacks(Number(userId), feedback_type)
  }

  @Get()
  async findAll(
    @Query('feedback_type') feedback_type?: FeedbackType,
  ) {
    return this.feedbackService.findAllFeedbacks(feedback_type)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findById(id)
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '../../storage/database/supabase-client';

interface SubmitFeedbackParams {
  user_id: number;
  feedback_type: 'bug_report' | 'new_game' | 'new_tool' | 'suggestion';
  content: string;
  images?: string[];
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  // 临时模拟数据
  private mockFeedbacks = [
    {
      id: 1,
      user_id: 1,
      feedback_type: 'bug_report',
      content: '骰子功能在投掷时有时候会出现卡顿的情况，希望能优化一下动画效果',
      images: [],
      created_at: new Date('2024-01-15T10:30:00Z').toISOString(),
    },
    {
      id: 2,
      user_id: 2,
      feedback_type: 'new_game',
      content: '建议增加一个"石头剪刀布"的新桌游功能，这个很适合聚会玩',
      images: [],
      created_at: new Date('2024-01-14T15:20:00Z').toISOString(),
    },
  ];

  /**
   * 提交反馈（临时mock）
   */
  async submitFeedback(params: SubmitFeedbackParams) {
    const { user_id, feedback_type, content, images } = params;
    this.logger.log('用户提交反馈', { user_id, feedback_type, content: content.substring(0, 30) + '...' });

    // 临时返回成功，不实际写入数据库
    return {
      success: true,
      data: {
        id: Date.now(),
        user_id,
        feedback_type,
        content,
        images: images || [],
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * 获取当前用户的反馈列表（临时mock）
   */
  async findByUserId(userId: number) {
    this.logger.log('获取用户反馈列表', { userId });
    return {
      success: true,
      data: this.mockFeedbacks.filter((f) => f.user_id === userId),
    };
  }

  /**
   * 获取所有反馈列表（管理员用，临时mock）
   */
  async findAll(params: {
    feedback_type?: string;
    page?: number;
    page_size?: number;
  }) {
    const { feedback_type, page = 1, page_size = 20 } = params;
    this.logger.log('管理员获取反馈列表', { feedback_type, page, page_size });

    let filtered = this.mockFeedbacks;
    if (feedback_type && feedback_type !== 'all') {
      filtered = filtered.filter((f) => f.feedback_type === feedback_type);
    }

    const total = filtered.length;
    const start = (page - 1) * page_size;
    const data = filtered.slice(start, start + page_size);

    return {
      success: true,
      data,
      total,
    };
  }

  /**
   * 获取单个反馈详情（临时mock）
   */
  async findById(id: number) {
    this.logger.log('获取反馈详情', { id });
    const feedback = this.mockFeedbacks.find((f) => f.id === id);
    return {
      success: !!feedback,
      data: feedback,
    };
  }
}

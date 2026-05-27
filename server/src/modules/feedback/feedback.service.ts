import { Injectable, Logger } from '@nestjs/common';
import { getSupabaseClient } from '../../storage/database/supabase-client';

export type FeedbackType = 'bug_report' | 'new_game' | 'new_tool' | 'suggestion';

export interface Feedback {
  id: string;
  user_id: number;
  feedback_type: FeedbackType;
  content: string;
  images: string[];
  created_at: string;
  nickname?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  /**
   * 提交反馈
   */
  async submitFeedback(
    userId: number,
    feedbackType: FeedbackType,
    content: string,
    images: string[],
  ): Promise<{ success: boolean; data: Feedback }> {
    const supabase = getSupabaseClient();
    this.logger.log('提交反馈', { userId, feedbackType, content, imagesCount: images.length });

    // 插入数据库，注意字段名是 type 不是 feedback_type
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        user_id: userId,
        type: feedbackType,
        content,
        images,
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error('插入反馈失败', error);
      throw error;
    }

    // 数据库返回 type，映射为 feedback_type，删除原始 type 字段
    const { type: _type, ...rest } = data as any;
    const result = { ...rest, feedback_type: _type } as Feedback;
    return { success: true, data: result };
  }

  /**
   * 获取我的反馈列表
   */
  async findMyFeedbacks(
    userId: number,
    feedbackType?: FeedbackType,
  ): Promise<{ success: boolean; data: Feedback[] }> {
    const supabase = getSupabaseClient();
    this.logger.log('获取我的反馈列表', { userId, feedbackType });

    let query = supabase
      .from('feedbacks')
      .select('*, users(nickname)')
      .eq('user_id', userId);

    if (feedbackType) {
      query = query.eq('type', feedbackType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error('查询我的反馈失败', error);
      throw error;
    }

    const processedData = data?.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      feedback_type: item.type,
      content: item.content,
      images: item.images || [],
      created_at: item.created_at,
      nickname: item.users?.nickname || '未知用户',
    })) || [];

    return { success: true, data: processedData };
  }

  /**
   * 获取所有反馈列表（管理员用）
   */
  async findAllFeedbacks(
    feedbackType?: FeedbackType,
  ): Promise<{ success: boolean; data: Feedback[]; total: number }> {
    const supabase = getSupabaseClient();
    this.logger.log('获取所有反馈列表', { feedbackType });

    let query = supabase
      .from('feedbacks')
      .select('*, users(nickname)');

    if (feedbackType) {
      query = query.eq('type', feedbackType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error('查询反馈列表失败', error);
      throw error;
    }

    const processedData = data?.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      feedback_type: item.type,
      content: item.content,
      images: item.images || [],
      created_at: item.created_at,
      nickname: item.users?.nickname || '未知用户',
    })) || [];

    return { success: true, data: processedData, total: processedData.length };
  }

  /**
   * 获取单个反馈详情
   */
  async findById(
    id: string,
  ): Promise<{ success: boolean; data: Feedback }> {
    const supabase = getSupabaseClient();
    this.logger.log('获取反馈详情', { id });

    const { data, error } = await supabase
      .from('feedbacks')
      .select('*, users(nickname)')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error('查询反馈详情失败', error);
      throw error;
    }

    const processedData: Feedback = {
      id: data.id,
      user_id: data.user_id,
      feedback_type: data.type,
      content: data.content,
      images: data.images || [],
      created_at: data.created_at,
      nickname: (data as any)?.users?.nickname || '未知用户',
    };

    return { success: true, data: processedData };
  }
}

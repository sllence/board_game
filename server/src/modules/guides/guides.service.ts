import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class GuidesService {
  async findByGame(gameId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('guides')
      .select('id, title, desc, cover_icon, cover_bg, sort_order')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(`查询攻略列表失败: ${error.message}`)
    return { data }
  }

  async findOne(id: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('guides')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(`查询攻略详情失败: ${error.message}`)
    return { data }
  }
}

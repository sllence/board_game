import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class GamesService {
  async findAll(filters: {
    type?: string
    scene?: string
    min_players?: string
    max_players?: string
    duration?: string
    difficulty?: string
    keyword?: string
  }) {
    const client = getSupabaseClient()
    let query = client
      .from('board_games')
      .select(
        'id, name, type, scene, min_players, max_players, min_duration, max_duration, difficulty, icon_key, icon_bg, icon_color, image_url, intro, sort_order, status'
      )
      .order('sort_order', { ascending: true })
      .eq('status', 'online')

    if (filters.type) query = query.contains('type', [filters.type])
    if (filters.scene) query = query.contains('scene', [filters.scene])
    if (filters.difficulty) query = query.eq('difficulty', filters.difficulty)
    if (filters.duration) {
      const dur = Number(filters.duration)
      query = query.lte('max_duration', dur)
    }
    if (filters.min_players) {
      const p = Number(filters.min_players)
      query = query.lte('min_players', p).gte('max_players', p)
    }
    if (filters.keyword) query = query.ilike('name', `%${filters.keyword}%`)

    const { data, error } = await query
    if (error) throw new Error(`查询桌游列表失败: ${error.message}`)
    return { data }
  }

  async findHot(is_admin = false) {
    const client = getSupabaseClient()
    let query = client
      .from('board_games')
      .select(
        'id, name, type, scene, min_players, max_players, min_duration, max_duration, difficulty, icon_key, icon_bg, icon_color, image_url, status'
      )
      .order('sort_order', { ascending: true })
      .limit(6)

    // 如果是管理员，可以看到所有状态；否则只能看到online
    if (!is_admin) {
      query = query.eq('status', 'online')
    }

    const { data, error } = await query
    if (error) throw new Error(`查询热门桌游失败: ${error.message}`)
    return { data }
  }

  async findOne(id: number, is_admin = false) {
    const client = getSupabaseClient()
    let query = client
      .from('board_games')
      .select('*')
      .eq('id', id)

    // 如果是管理员，可以看到所有状态；否则只能看到online
    if (!is_admin) {
      query = query.eq('status', 'online')
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`查询桌游详情失败: ${error.message}`)
    return { data }
  }

  async create(gameData: any) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('board_games')
      .insert([gameData])
      .select()
      .single()
    if (error) throw new Error(`创建桌游失败: ${error.message}`)
    return { data }
  }

  async update(id: number, gameData: any) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('board_games')
      .update(gameData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`更新桌游失败: ${error.message}`)
    return { data }
  }

  async delete(id: number) {
    const client = getSupabaseClient()
    const { error } = await client
      .from('board_games')
      .update({ status: 'offline' })
      .eq('id', id)
    if (error) throw new Error(`删除桌游失败: ${error.message}`)
    return { success: true }
  }
}

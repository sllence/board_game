import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

@Injectable()
export class SessionsService {
  async create(body: {
    user_id?: number
    game_id: number
    session_name?: string
    players: any[]
  }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_sessions')
      .insert({
        user_id: body.user_id || null,
        game_id: body.game_id,
        session_name: body.session_name || null,
        players: body.players,
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()
    if (error) throw new Error(`创建对局失败: ${error.message}`)
    return { data }
  }

  async findAll(filters: {
    user_id?: string
    game_id?: string
    status?: string
  }) {
    const client = getSupabaseClient()
    let query = client
      .from('game_sessions')
      .select('id, game_id, session_name, players, winner, rounds, duration, status, started_at, finished_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filters.user_id) query = query.eq('user_id', Number(filters.user_id))
    if (filters.game_id) query = query.eq('game_id', Number(filters.game_id))
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw new Error(`查询对局列表失败: ${error.message}`)
    return { data }
  }

  async findRecent(userId?: number) {
    const client = getSupabaseClient()
    let query = client
      .from('game_sessions')
      .select('id, game_id, session_name, players, winner, duration, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw new Error(`查询最近对局失败: ${error.message}`)
    return { data }
  }

  async findOne(id: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`查询对局详情失败: ${error.message}`)
    return { data }
  }

  async update(id: number, body: any) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_sessions')
      .update(body)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`更新对局失败: ${error.message}`)
    return { data }
  }

  async finish(id: number, winner?: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_sessions')
      .update({
        status: 'finished',
        winner: winner || null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`结束对局失败: ${error.message}`)
    return { data }
  }
}

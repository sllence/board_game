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
      .select('id, game_id, session_name, players, winner, rounds, duration, status, started_at, finished_at, created_at, game:board_games(id, name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filters.user_id) query = query.eq('user_id', Number(filters.user_id))
    if (filters.game_id) query = query.eq('game_id', Number(filters.game_id))
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw new Error(`查询对局列表失败: ${error.message}`)

    // 如果有 user_id，批量查询收藏状态
    let favSet = new Set<number>()
    if (filters.user_id) {
      const userId = Number(filters.user_id)
      const { data: favData } = await client
        .from('favorites')
        .select('game_id')
        .eq('user_id', userId)
      if (favData) favSet = new Set(favData.map((f: any) => f.game_id))
    }

    const result = (data || []).map((item: any) => ({
      ...item,
      is_favorited: favSet.has(item.id),
    }))

    return { data: result }
  }

  async findRecent(userId?: number) {
    const client = getSupabaseClient()
    let query = client
      .from('game_sessions')
      .select('id, game_id, session_name, players, winner, duration, status, created_at, game:board_games(id, name)')
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
      .select('*, game:board_games(id, name, min_players, max_players, sections, tips, icon_bg, hero_bg, scoring_config)')
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

  async favoriteSession(sessionId: number, userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('favorites')
      .upsert({ game_id: sessionId, user_id: userId }, { onConflict: 'user_id,game_id' })
      .select()
      .maybeSingle()
    if (error) throw new Error(`收藏对局失败: ${error.message}`)
    return { data }
  }

  async unfavoriteSession(sessionId: number, userId: number) {
    const client = getSupabaseClient()
    const { error } = await client
      .from('favorites')
      .delete()
      .eq('game_id', sessionId)
      .eq('user_id', userId)
    if (error) throw new Error(`取消收藏对局失败: ${error.message}`)
    return { data: null }
  }

  async getFavoriteSessions(userId: number) {
    const client = getSupabaseClient()
    // 先获取收藏记录
    const { data: favData, error: favError } = await client
      .from('favorites')
      .select('id, game_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (favError) throw new Error(`查询收藏对局失败: ${favError.message}`)
    if (!favData || favData.length === 0) return { data: [] }

    // 再批量查询对应的对局
    const gameIds = favData.map((f: any) => f.game_id)
    const { data: sessions, error: sessionError } = await client
      .from('game_sessions')
      .select('id, game_id, session_name, players, winner, duration, status, created_at, game:board_games(id, name)')
      .in('id', gameIds)
    if (sessionError) throw new Error(`查询收藏对局失败: ${sessionError.message}`)

    // 合并数据，按收藏时间排序
    const favMap = new Map(favData.map((f: any) => [f.game_id, f]))
    const result = (sessions || []).map((s: any) => ({
      ...s,
      favorite_id: favMap.get(s.id)?.id,
      favorited_at: favMap.get(s.id)?.created_at,
      is_favorited: true,
    }))
    // 按 favorited_at 排序
    result.sort((a: any, b: any) => new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime())
    return { data: result }
  }

  async isSessionFavorited(sessionId: number, userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('favorites')
      .select('id')
      .eq('game_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`查询收藏状态失败: ${error.message}`)
    return { data: { is_favorited: !!data } }
  }

  async finish(id: number, winner?: string, scoringSnapshot?: any[], durationSeconds?: number) {
    const client = getSupabaseClient()

    // 先读取 user_id 用于更新统计
    const { data: session } = await client
      .from('game_sessions')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()

    const updateData: any = {
      status: 'finished',
      winner: winner || null,
      finished_at: new Date().toISOString(),
    }
    if (scoringSnapshot) updateData.scoring_snapshot = scoringSnapshot
    if (durationSeconds !== undefined) updateData.duration = durationSeconds

    const { data, error } = await client
      .from('game_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`结束对局失败: ${error.message}`)

    // 更新用户统计数据
    if (session?.user_id) {
      const { data: user } = await client
        .from('users')
        .select('nickname, total_games, total_wins, total_time')
        .eq('id', session.user_id)
        .maybeSingle()

      if (user) {
        const isWinner = winner && user.nickname === winner
        await client.from('users').update({
          total_games: (user.total_games || 0) + 1,
          total_wins: isWinner ? (user.total_wins || 0) + 1 : (user.total_wins || 0),
          total_time: (user.total_time || 0) + (durationSeconds || 0),
          updated_at: new Date().toISOString(),
        }).eq('id', session.user_id)
      }
    }

    return { data }
  }
}

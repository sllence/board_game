import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

export interface ProbWheelItem {
  label: string
  color?: string
  weight: number
}

export interface InvWheelItem {
  label: string
  color?: string
  inventory: number
}

export type WheelItem = ProbWheelItem | InvWheelItem

@Injectable()
export class WheelService {
  async create(body: {
    user_id?: number
    title: string
    type: 'probability' | 'inventory'
    items: WheelItem[]
  }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheels')
      .insert({
        user_id: body.user_id || null,
        title: body.title,
        type: body.type,
        items: body.items,
      })
      .select()
      .maybeSingle()
    if (error) throw new Error(`创建转盘失败: ${error.message}`)
    return { data }
  }

  async findAll(userId?: number) {
    const client = getSupabaseClient()
    let query = client
      .from('wheels')
      .select('id, title, type, items, created_at, updated_at, user_id, users(nickname)')
      .order('updated_at', { ascending: false })

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    }

    const { data, error } = await query
    if (error) throw new Error(`查询转盘列表失败: ${error.message}`)

    // 查询用户收藏的转盘 ID
    let favoritedIds: Set<number> = new Set()
    if (userId) {
      const { data: favData } = await client
        .from('wheel_favorites')
        .select('wheel_id')
        .eq('user_id', userId)
      if (favData) {
        favoritedIds = new Set(favData.map((f: any) => f.wheel_id))
      }
    }

    const result = (data || []).map((item: any) => ({
      ...item,
      is_owner: !item.user_id || item.user_id === userId,
      is_favorited: favoritedIds.has(item.id),
      creator_nickname: item.users?.nickname || null,
    }))
    // 移除 users 字段
    result.forEach((r: any) => { delete r.users })

    return { data: result }
  }

  async findOne(id: number, userId?: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheels')
      .select('id, title, type, items, created_at, updated_at, user_id, users(nickname)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`查询转盘失败: ${error.message}`)

    // 查询是否已收藏
    let isFavorited = false
    if (userId) {
      const { data: favData } = await client
        .from('wheel_favorites')
        .select('id')
        .eq('wheel_id', id)
        .eq('user_id', userId)
        .maybeSingle()
      isFavorited = !!favData
    }

    const creatorNickname = Array.isArray((data as any)?.users) ? (data as any).users[0]?.nickname : (data as any)?.users?.nickname || null
    const result = { ...data, is_owner: !data?.user_id || data?.user_id === userId, is_favorited: isFavorited, creator_nickname: creatorNickname }
    delete (result as any).users
    return { data: result }
  }

  async update(id: number, body: {
    title?: string
    type?: 'probability' | 'inventory'
    items?: WheelItem[]
  }) {
    const client = getSupabaseClient()
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updateData.title = body.title
    if (body.type !== undefined) updateData.type = body.type
    if (body.items !== undefined) updateData.items = body.items

    const { data, error } = await client
      .from('wheels')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`更新转盘失败: ${error.message}`)
    return { data }
  }

  async remove(id: number) {
    const client = getSupabaseClient()
    const { error } = await client
      .from('wheels')
      .delete()
      .eq('id', id)
    if (error) throw new Error(`删除转盘失败: ${error.message}`)
    return { success: true }
  }

  async spin(wheelId: number) {
    const client = getSupabaseClient()
    // 获取转盘信息
    const { data: wheel, error: wheelError } = await client
      .from('wheels')
      .select('*')
      .eq('id', wheelId)
      .maybeSingle()
    if (wheelError || !wheel) throw new Error('转盘不存在')

    const items = wheel.items as WheelItem[]
    if (!items || items.length === 0) throw new Error('转盘没有选项')

    let resultLabel = ''
    let resultIndex = -1

    if (wheel.type === 'inventory') {
      const invItems = items as InvWheelItem[]
      const available = invItems.filter((i) => i.inventory > 0)
      if (available.length === 0) throw new Error('所有奖品已抽完')

      const totalInv = available.reduce((sum, i) => sum + i.inventory, 0)
      let rand = Math.random() * totalInv
      for (let i = 0; i < invItems.length; i++) {
        if (invItems[i].inventory <= 0) continue
        rand -= invItems[i].inventory
        if (rand <= 0) {
          resultIndex = i
          resultLabel = invItems[i].label
          break
        }
      }
      if (resultIndex === -1) {
        // 浮点累减误差兜底：选最后一个有库存的项（误差累计的方向）
        for (let i = invItems.length - 1; i >= 0; i--) {
          if (invItems[i].inventory > 0) {
            resultIndex = i
            resultLabel = invItems[i].label
            break
          }
        }
      }
      // 减少库存
      invItems[resultIndex].inventory -= 1
      await client.from('wheels').update({ items: invItems }).eq('id', wheelId)
    } else {
      const probItems = items as ProbWheelItem[]
      const totalWeight = probItems.reduce((sum, i) => sum + (i.weight || 1), 0)
      let rand = Math.random() * totalWeight
      for (let i = 0; i < probItems.length; i++) {
        rand -= (probItems[i].weight || 1)
        if (rand <= 0) {
          resultIndex = i
          resultLabel = probItems[i].label
          break
        }
      }
      if (resultIndex === -1) {
        // 浮点累减误差兜底：选最后一项
        resultIndex = probItems.length - 1
        resultLabel = probItems[resultIndex].label
      }
    }

    // 记录历史
    const { data: history, error: historyError } = await client
      .from('wheel_history')
      .insert({ wheel_id: wheelId, result: resultLabel })
      .select()
      .maybeSingle()
    if (historyError) throw new Error(`记录历史失败: ${historyError.message}`)

    return { data: { result: resultLabel, index: resultIndex, history } }
  }

  async findHistory(wheelId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheel_history')
      .select('id, result, created_at')
      .eq('wheel_id', wheelId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(`查询历史失败: ${error.message}`)
    return { data }
  }

  async duplicate(wheelId: number, userId?: number) {
    const client = getSupabaseClient()
    const { data: wheel, error: wheelError } = await client
      .from('wheels')
      .select('title, type, items')
      .eq('id', wheelId)
      .maybeSingle()
    if (wheelError || !wheel) throw new Error('转盘不存在')

    const { data, error } = await client
      .from('wheels')
      .insert({
        user_id: userId || null,
        title: wheel.title,
        type: wheel.type,
        items: wheel.items,
      })
      .select()
      .maybeSingle()
    if (error) throw new Error(`复制转盘失败: ${error.message}`)
    return { data }
  }

  // 收藏转盘
  async favorite(wheelId: number, userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheel_favorites')
      .insert({ wheel_id: wheelId, user_id: userId })
      .select()
      .maybeSingle()
    if (error) {
      if (error.code === '23505') {
        // 已收藏，忽略
        return { data: { wheel_id: wheelId, user_id: userId } }
      }
      throw new Error(`收藏失败: ${error.message}`)
    }
    return { data }
  }

  // 取消收藏
  async unfavorite(wheelId: number, userId: number) {
    const client = getSupabaseClient()
    const { error } = await client
      .from('wheel_favorites')
      .delete()
      .eq('wheel_id', wheelId)
      .eq('user_id', userId)
    if (error) throw new Error(`取消收藏失败: ${error.message}`)
    return { success: true }
  }

  // 查询用户收藏的转盘列表
  async findFavorites(userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheel_favorites')
      .select('id, wheel_id, created_at, wheels(id, title, type, items, created_at, updated_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`查询收藏列表失败: ${error.message}`)
    // 展平 wheels 数据
    const result = (data || []).map((item: any) => ({
      id: item.wheels?.id,
      title: item.wheels?.title,
      type: item.wheels?.type,
      items: item.wheels?.items,
      created_at: item.wheels?.created_at,
      updated_at: item.wheels?.updated_at,
      is_favorited: true,
    })).filter((item: any) => item.id != null)
    return { data: result }
  }

  // 查询用户是否收藏了某个转盘
  async isFavorited(wheelId: number, userId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheel_favorites')
      .select('id')
      .eq('wheel_id', wheelId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`查询收藏状态失败: ${error.message}`)
    return { data: { is_favorited: !!data } }
  }
}

import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'

export interface WheelItem {
  label: string
  color?: string
}

@Injectable()
export class WheelService {
  async create(body: {
    user_id?: number
    title: string
    items: WheelItem[]
  }) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheels')
      .insert({
        user_id: body.user_id || null,
        title: body.title,
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
      .select('id, title, items, created_at, updated_at')
      .order('updated_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) throw new Error(`查询转盘列表失败: ${error.message}`)
    return { data }
  }

  async findOne(id: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheels')
      .select('id, title, items, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`查询转盘失败: ${error.message}`)
    return { data }
  }

  async update(id: number, body: {
    title?: string
    items?: WheelItem[]
  }) {
    const client = getSupabaseClient()
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updateData.title = body.title
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

  async recordHistory(wheelId: number, result: string) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('wheel_history')
      .insert({ wheel_id: wheelId, result })
      .select()
      .maybeSingle()
    if (error) throw new Error(`记录历史失败: ${error.message}`)
    return { data }
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
}

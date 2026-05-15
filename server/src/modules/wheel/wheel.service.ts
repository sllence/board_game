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
      .select('id, title, type, items, created_at, updated_at')
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
      .select('id, title, type, items, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`查询转盘失败: ${error.message}`)
    return { data }
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
        resultIndex = invItems.findIndex((i) => i.inventory > 0)
        resultLabel = invItems[resultIndex].label
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
}

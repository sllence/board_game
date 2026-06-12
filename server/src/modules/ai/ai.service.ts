import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { LLMClient, Config } from 'coze-coding-dev-sdk'

@Injectable()
export class AiService {
  async chat(gameId: number, question: string) {
    const client = getSupabaseClient()

    // 查询桌游规则
    const { data: game, error } = await client
      .from('board_games')
      .select('name, rules, tips')
      .eq('id', gameId)
      .maybeSingle()
    if (error) throw new Error(`查询桌游失败: ${error.message}`)
    if (!game) throw new Error('桌游不存在')

    // 组装 Prompt
    const rulesContent = typeof game.rules === 'string' ? game.rules : ''
    const tipsContent = Array.isArray(game.tips)
      ? game.tips.map((t: string) => `- ${t}`).join('\n')
      : ''

    const systemPrompt = `你是一个桌游规则助手。只回答关于「${game.name}」的规则问题。
如果问题与该桌游无关，请礼貌拒绝。

桌游规则：
${rulesContent}

新手技巧：
${tipsContent}

请用简洁清晰的语言回答，必要时引用规则原文。`

    const llmClient = new LLMClient(new Config())
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ]

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    })

    return { data: { answer: response.content } }
  }
}

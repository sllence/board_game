import { Injectable, BadRequestException } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import * as fs from 'fs/promises'
import * as path from 'path'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

@Injectable()
export class GameRulesService {
  /**
   * 获取某桌游的所有规则（按 sort_order 排序）
   */
  async findAll(gameId: number) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_rules')
      .select('*')
      .eq('game_id', gameId)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(`查询规则列表失败: ${error.message}`)
    return { data: data ?? [] }
  }

  /**
   * 创建一条规则
   */
  async create(body: {
    game_id: number
    title: string
    rule_type: string
    content?: string
    image_urls?: string[]
    sort_order?: number
  }) {
    if (!body.title?.trim()) throw new BadRequestException('规则标题不能为空')
    if (!['markdown', 'images'].includes(body.rule_type)) {
      throw new BadRequestException('规则类型必须是 markdown 或 images')
    }

    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_rules')
      .insert([{
        game_id: body.game_id,
        title: body.title.trim(),
        rule_type: body.rule_type,
        content: body.rule_type === 'markdown' ? body.content || '' : null,
        image_urls: body.rule_type === 'images' ? (body.image_urls || []) : [],
        sort_order: body.sort_order ?? 0,
      }])
      .select()
      .single()

    if (error) throw new Error(`创建规则失败: ${error.message}`)
    return { data }
  }

  /**
   * 更新一条规则
   */
  async update(id: number, body: {
    title?: string
    rule_type?: string
    content?: string
    image_urls?: string[]
    sort_order?: number
  }) {
    const updateData: Record<string, any> = {}

    if (body.title !== undefined) {
      if (!body.title.trim()) throw new BadRequestException('规则标题不能为空')
      updateData.title = body.title.trim()
    }
    if (body.rule_type !== undefined) {
      if (!['markdown', 'images'].includes(body.rule_type)) {
        throw new BadRequestException('规则类型必须是 markdown 或 images')
      }
      updateData.rule_type = body.rule_type
    }
    if (body.content !== undefined) updateData.content = body.content
    if (body.image_urls !== undefined) updateData.image_urls = body.image_urls
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order

    const client = getSupabaseClient()
    const { data, error } = await client
      .from('game_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`更新规则失败: ${error.message}`)
    return { data }
  }

  /**
   * 删除一条规则
   */
  async delete(id: number) {
    const client = getSupabaseClient()
    const { error } = await client
      .from('game_rules')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`删除规则失败: ${error.message}`)
    return { success: true }
  }

  /**
   * 上传 PDF 并转换为图片
   * 返回转换后的图片 URL 数组
   */
  async uploadPdfAndConvert(file: Express.Multer.File) {
    console.log('[GameRulesService] PDF上传转换开始:', file.originalname, '大小:', file.size)

    // 1. 获取文件内容（双模式兼容）
    let fileContent: Buffer
    if (file.buffer) {
      fileContent = file.buffer
    } else if (file.path) {
      fileContent = await fs.readFile(file.path)
    } else {
      throw new BadRequestException('无法获取文件内容')
    }

    // 2. 写入临时 PDF 文件
    const tmpDir = '/tmp/pdf-convert'
    await fs.mkdir(tmpDir, { recursive: true })
    const pdfPath = path.join(tmpDir, `${randomUUID()}.pdf`)
    await fs.writeFile(pdfPath, fileContent)

    try {
      // 3. 使用 pdftoppm 拆分为 PNG 图片
      const outputPrefix = path.join(tmpDir, randomUUID())
      execSync(`pdftoppm -png -r 200 "${pdfPath}" "${outputPrefix}"`, {
        timeout: 60000, // 60秒超时
      })

      // 4. 读取生成的图片文件
      const { readdir } = await import('fs/promises')
      const files = await readdir(tmpDir)
      const pngFiles = files
        .filter(f => f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png'))
        .sort()

      if (pngFiles.length === 0) {
        throw new BadRequestException('PDF 转换失败：未生成任何图片')
      }

      console.log('[GameRulesService] PDF 转换完成，生成图片数:', pngFiles.length)

      // 5. 逐张上传到对象存储
      const { S3Storage } = await import('coze-coding-dev-sdk')
      const storage = new S3Storage({
        endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
        accessKey: '',
        secretKey: '',
        bucketName: process.env.COZE_BUCKET_NAME,
        region: 'cn-beijing',
      })

      const imageUrls: string[] = []
      for (const pngFile of pngFiles) {
        const pngPath = path.join(tmpDir, pngFile)
        const pngContent = await fs.readFile(pngPath)
        const fileKey = await storage.uploadFile({
          fileContent: pngContent,
          fileName: `rules/${Date.now()}_${pngFile}`,
          contentType: 'image/png',
        })
        const url = await storage.generatePresignedUrl({
          key: fileKey,
          expireTime: 7 * 24 * 3600,
        })
        imageUrls.push(url)

        // 删除临时图片
        await fs.unlink(pngPath).catch(() => {})
      }

      console.log('[GameRulesService] 图片上传完成，共', imageUrls.length, '张')

      return { data: { imageUrls } }
    } finally {
      // 6. 清理临时 PDF
      await fs.unlink(pdfPath).catch(() => {})
    }
  }
}
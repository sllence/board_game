import { Injectable, BadRequestException } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { StorageService } from '@/modules/storage/storage.service'
import * as fs from 'fs/promises'
import * as path from 'path'
import { promisify } from 'util'
import { exec } from 'child_process'

const asyncExec = promisify(exec)
import { randomUUID } from 'crypto'

@Injectable()
export class GameRulesService {
  constructor(private readonly storageService: StorageService) {}
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
        status: 'active',
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
   * 上传 PDF 并异步转换为图片
   * 立即返回 taskId，后台异步处理转换
   */
  async uploadPdfAndConvert(file: Express.Multer.File) {
    console.log('[GameRulesService] PDF上传开始:', file.originalname, '大小:', file.size)

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
    const taskId = randomUUID()
    const pdfPath = path.join(tmpDir, `${taskId}.pdf`)
    await fs.writeFile(pdfPath, fileContent)

    // 3. 异步启动后台转换（不阻塞响应）
    this.processPdfConversion(taskId, pdfPath, tmpDir).catch(err => {
      console.error('[GameRulesService] 后台转换失败:', err)
    })

    // 4. 立即返回 taskId，前端轮询结果
    return {
      data: {
        taskId,
        status: 'processing',
        imageUrls: [],
        message: 'PDF 正在后台转换，请稍后查询',
      }
    }
  }

  /**
   * 创建规则 + 关联 PDF（保存规则后异步转换）
   * 先存规则（image_urls=[]），后台异步转换 PDF，转换完成后更新规则
   */
  async createWithPdf(
    body: {
      game_id: number
      title: string
      rule_type: string
      content?: string
      sort_order?: number
    },
    file: Express.Multer.File,
  ) {
    // 1. 先创建规则，image_urls 留空，状态标记为转换中
    const rule = await this.create({
      ...body,
      rule_type: 'images',
      image_urls: [],
    })

    const ruleId = rule.data.id

    // 标记为转换中
    const supabaseClient = await getSupabaseClient()
    await supabaseClient
      .from('game_rules')
      .update({ status: 'converting' })
      .eq('id', ruleId)

    // 2. 写入临时 PDF 文件
    let fileContent: Buffer
    if (file.buffer) {
      fileContent = file.buffer
    } else if (file.path) {
      fileContent = await fs.readFile(file.path)
    } else {
      throw new BadRequestException('无法获取文件内容')
    }

    const tmpDir = '/tmp/pdf-convert'
    await fs.mkdir(tmpDir, { recursive: true })
    const taskId = randomUUID()
    const pdfPath = path.join(tmpDir, `${taskId}.pdf`)
    await fs.writeFile(pdfPath, fileContent)

    // 3. 异步转换，完成后更新规则的 image_urls
    this.processPdfConversionAndUpdateRule(taskId, pdfPath, tmpDir, ruleId).catch(err => {
      console.error('[GameRulesService] 后台转换失败:', err)
    })

    // 4. 返回已创建的规则（不含图片，图片后续更新）
    return {
      data: {
        ...rule.data,
        status: 'converting',
        message: '规则已保存，PDF 正在后台转换中',
      },
    }
  }

  /**
   * 异步后台转换 PDF，完成后更新数据库
   */
  private async processPdfConversionAndUpdateRule(
    taskId: string,
    pdfPath: string,
    tmpDir: string,
    ruleId: number,
  ): Promise<string[]> {
    try {
      // 转换 PDF 为图片
      const imageUrls = await this.runPdfConversion(taskId, pdfPath, tmpDir)

      // 更新数据库中的 image_urls
      if (imageUrls.length > 0) {
        const client = getSupabaseClient()
        const { error } = await client
          .from('game_rules')
          .update({ image_urls: imageUrls, status: 'active' })
          .eq('id', ruleId)

        if (error) {
          console.error('[GameRulesService] 更新规则图片失败:', error.message)
        } else {
          console.log(`[GameRulesService] 规则 ${ruleId} 图片更新完成，共 ${imageUrls.length} 张`)
        }
      }

      return imageUrls
    } catch (err) {
      console.error('[GameRulesService] 异步转换失败:', err)
      // 标记为转换失败
      try {
        const client = getSupabaseClient()
        await client.from('game_rules').update({ status: 'failed' }).eq('id', ruleId)
      } catch (updateErr) {
        console.error('[GameRulesService] 更新失败状态出错:', updateErr)
      }
      return []
    } finally {
      await fs.unlink(pdfPath).catch(() => {})
    }
  }

  /**
   * 提取 PDF 转换 + 上传 S3 的公共逻辑
   */
  private async runPdfConversion(taskId: string, pdfPath: string, tmpDir: string): Promise<string[]> {
    // 1. 使用 pdftoppm 拆分为 PNG（异步，不阻塞事件循环）
    const outputPrefix = path.join(tmpDir, taskId)
    console.log(`[PDF转换] 开始 pdftoppm: ${pdfPath}`)
    const convertStart = Date.now()
    const { stderr } = await asyncExec(
      `/usr/bin/pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`,
      { timeout: 600000 } // 10 分钟
    )
    if (stderr) console.warn(`[PDF转换] pdftoppm stderr:`, stderr)
    console.log(`[PDF转换] pdftoppm 完成, 耗时 ${Date.now() - convertStart}ms`)

    // 2. 读取生成的图片文件
    const { readdir } = await import('fs/promises')
    const files = await readdir(tmpDir)
    const pngFiles = files
      .filter(f => f.startsWith(taskId) && f.endsWith('.png') && f.includes('-'))
      .sort()

    if (pngFiles.length === 0) {
      console.warn('[GameRulesService] PDF转换未生成图片')
      return []
    }

    console.log('[GameRulesService] PDF转换完成，生成图片数:', pngFiles.length)

    // 3. 上传到对象存储（并行）
    const uploadTasks = pngFiles.map(async (pngFile) => {
      try {
        const pngPath = path.join(tmpDir, pngFile)
        const pngContent = await fs.readFile(pngPath)
        const url = await this.storageService.uploadAvatar({
          buffer: pngContent,
          originalname: `rules/${taskId}_${pngFile}`,
          mimetype: 'image/png',
        })
        await fs.unlink(pngPath).catch(() => {})
        return url
      } catch (err) {
        console.error(`[GameRulesService] 上传图片失败 ${pngFile}:`, err)
        return null
      }
    })

    const results = await Promise.all(uploadTasks)
    return results.filter(Boolean) as string[]
  }

  /**
   * 查询 PDF 转换结果
   */
  async getConvertStatus(taskId: string) {
    const tmpDir = '/tmp/pdf-convert'
    const resultFile = path.join(tmpDir, `${taskId}_result.json`)
    try {
      const content = await fs.readFile(resultFile, 'utf-8')
      const result = JSON.parse(content)
      return { data: result }
    } catch {
      // 结果文件不存在→仍在处理或已超时
      const pdfPath = path.join(tmpDir, `${taskId}.pdf`)
      try {
        await fs.access(pdfPath)
        return { data: { status: 'processing', imageUrls: [] } }
      } catch {
        return { data: { status: 'expired', imageUrls: [] } }
      }
    }
  }

  /**
   * 异步后台处理 PDF 转换 + 上传
   */
  private async processPdfConversion(taskId: string, pdfPath: string, tmpDir: string): Promise<string[]> {
    try {
      // 1. 使用 pdftoppm 拆分为 PNG（DPI 150 平衡速度与画质）
      const outputPrefix = path.join(tmpDir, taskId)
      console.log(`[GameRulesService] 开始转换PDF: ${pdfPath}`)
      const startTime = Date.now()
      await asyncExec(`/usr/bin/pdftoppm -png -r 150 "${pdfPath}" "${outputPrefix}"`, {
        timeout: 600000,
      })
      console.log(`[GameRulesService] pdftoppm 完成, 耗时: ${Date.now() - startTime}ms`)

      // 2. 读取生成的图片文件
      const { readdir } = await import('fs/promises')
      const files = await readdir(tmpDir)
      const pngFiles = files
        .filter(f => f.startsWith(taskId) && f.endsWith('.png') && f.includes('-'))
        .sort()

      if (pngFiles.length === 0) {
        console.warn('[GameRulesService] PDF转换未生成图片，可能是空PDF')
        await this.writeResult(tmpDir, taskId, [])
        return []
      }

      console.log('[GameRulesService] PDF转换完成，生成图片数:', pngFiles.length)

      console.log('[GameRulesService] 开始并行上传到S3，图片数:', pngFiles.length)
      const uploadStartTime = Date.now()
      const uploadTasks = pngFiles.map(async (pngFile) => {
        try {
          const pngPath = path.join(tmpDir, pngFile)
          const pngContent = await fs.readFile(pngPath)
          const url = await this.storageService.uploadAvatar({
            buffer: pngContent,
            originalname: `rules/${taskId}_${pngFile}`,
            mimetype: 'image/png',
          })
          await fs.unlink(pngPath).catch(() => {})
          return url
        } catch (err) {
          console.error(`[GameRulesService] 上传图片失败 ${pngFile}:`, err)
          return null
        }
      })

      const results = await Promise.all(uploadTasks)
      const imageUrls = results.filter(Boolean) as string[]

      console.log('[GameRulesService] 图片上传完成，共', imageUrls.length, '张')

      // 4. 写入结果文件供查询
      await this.writeResult(tmpDir, taskId, imageUrls)

      return imageUrls
    } catch (err) {
      console.error('[GameRulesService] PDF转换异常:', err)
      await this.writeResult(tmpDir, taskId, [])
      return []
    } finally {
      // 清理 PDF 文件
      await fs.unlink(pdfPath).catch(() => {})
    }
  }

  private async writeResult(tmpDir: string, taskId: string, imageUrls: string[]) {
    const resultFile = path.join(tmpDir, `${taskId}_result.json`)
    await fs.writeFile(resultFile, JSON.stringify({ status: 'done', imageUrls }), 'utf-8')
  }
}
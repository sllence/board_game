import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseInterceptors, UploadedFile, HttpCode } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { GameRulesService } from './game-rules.service'
import { Public, Roles } from '../../auth/decorators'

@Controller('game-rules')
export class GameRulesController {
  constructor(private readonly gameRulesService: GameRulesService) {}

  /**
   * 获取某桌游的所有规则（公开接口）
   */
  @Get()
  @Public()
  async findAll(@Query('game_id') gameId: string) {
    return this.gameRulesService.findAll(Number(gameId))
  }

  /**
   * 创建一条规则（需管理员权限）
   */
  @Post()
  @Roles('admin')
  @HttpCode(200)
  async create(@Body() body: {
    game_id: number
    title: string
    rule_type: string
    content?: string
    image_urls?: string[]
    sort_order?: number
  }) {
    return this.gameRulesService.create(body)
  }

  /**
   * 更新一条规则（需管理员权限）
   */
  @Put(':id')
  @Roles('admin')
  @HttpCode(200)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.gameRulesService.update(Number(id), body)
  }

  /**
   * 删除一条规则（需管理员权限）
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(200)
  async delete(@Param('id') id: string) {
    return this.gameRulesService.delete(Number(id))
  }

  /**
   * 上传 PDF 并转换为图片（需管理员权限）
   */
  @Post('upload-pdf')
  @Roles('admin')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('仅支持 PDF 文件'), false)
      } else {
        cb(null, true)
      }
    },
  }))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.gameRulesService.uploadPdfAndConvert(file)
  }

  /**
   * 保存规则 + 上传 PDF（保存后异步转换）
   * 先创建规则（image_urls=[]），后端异步转换 PDF 后自动更新 image_urls
   */
  @Post('with-pdf')
  @Roles('admin')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('仅支持 PDF 文件'), false)
      } else {
        cb(null, true)
      }
    },
  }))
  async createWithPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.gameRulesService.createWithPdf({
      game_id: Number(body.game_id),
      title: body.title,
      rule_type: 'images',
      content: body.content || '',
      sort_order: body.sort_order ? Number(body.sort_order) : 0,
    }, file)
  }

  /**
   * 查询 PDF 转换进度（公开接口）
   */
  @Get('convert-status/:taskId')
  @Public()
  @HttpCode(200)
  async getConvertStatus(@Param('taskId') taskId: string) {
    return this.gameRulesService.getConvertStatus(taskId)
  }
}
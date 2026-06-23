import { Controller, Get, Post, Delete, Param, Query, Body, Req, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { SessionPhotosService } from './session-photos.service'
import { Public } from '../../auth/decorators'

@Controller('sessions')
export class SessionPhotosController {
  constructor(private readonly photosService: SessionPhotosService) {}

  @Public()
  @Get(':sessionId/photos')
  async findBySession(@Param('sessionId') sessionId: string) {
    return { code: 200, data: await this.photosService.findBySession(parseInt(sessionId)) }
  }

  @Post(':sessionId/photos/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    const userId = req.user?.id || 1
    const photo = await this.photosService.upload(parseInt(sessionId), userId, file, caption)
    return { code: 200, data: photo }
  }

  @Delete(':sessionId/photos/:id')
  async delete(@Param('id') id: string) {
    const result = await this.photosService.delete(parseInt(id))
    if (!result) return { code: 404, msg: '照片不存在' }
    return { code: 200, msg: '删除成功' }
  }
}
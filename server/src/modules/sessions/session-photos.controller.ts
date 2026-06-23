import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { Public } from '../../auth/decorators'
import { SessionPhotosService } from './session-photos.service'

@Controller('session-photos')
export class SessionPhotosController {
  constructor(private readonly photosService: SessionPhotosService) {}

  @Public()
  @Get(':sessionId/photos')
  async listPhotos(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const photos = await this.photosService.findBySession(sessionId)
    return {
      code: 200,
      msg: 'success',
      data: photos,
    }
  }

  @Post(':sessionId/photos')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { caption?: string; userId?: string } = {},
  ) {
    const userId = body.userId ? Number(body.userId) : null
    const data = await this.photosService.uploadPhoto(sessionId, file, {
      userId,
      caption: body.caption || null,
    })
    return {
      code: 200,
      msg: '上传成功',
      data,
    }
  }

  @Delete(':sessionId/photos/:photoId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Query('userId') userId?: string,
  ) {
    await this.photosService.deletePhoto(sessionId, photoId)
    return { code: 200, msg: '删除成功' }
  }
}

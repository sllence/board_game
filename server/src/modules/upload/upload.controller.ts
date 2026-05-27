import { Controller, Post, UploadedFile, UseInterceptors, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('[UploadController] 收到上传请求, 文件:', file?.originalname);

    if (!file) {
      return { code: 400, msg: '未收到文件', data: null };
    }

    const { fileKey, url } = await this.uploadService.uploadFile(file);

    return {
      code: 200,
      msg: '上传成功',
      data: { fileKey, url },
    };
  }
}

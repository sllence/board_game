import { Injectable } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class UploadService {
  private storage: S3Storage;

  constructor() {
    this.storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }

  /**
   * 上传文件到对象存储
   * @param file Multer 文件对象
   * @returns 文件 key 和访问 URL
   */
  async uploadFile(file: Express.Multer.File) {
    console.log('[UploadService] 上传文件:', file.originalname, '大小:', file.size, '类型:', file.mimetype);

    // 获取文件内容（同时支持小程序 file.path 和 H5 file.buffer）
    let fileContent: Buffer;
    if (file.buffer) {
      fileContent = file.buffer;
    } else if (file.path) {
      const fs = await import('fs/promises');
      fileContent = await fs.readFile(file.path);
    } else {
      throw new Error('无法获取文件内容');
    }

    // 上传到对象存储
    const fileKey = await this.storage.uploadFile({
      fileContent,
      fileName: `feedback/${Date.now()}_${file.originalname}`,
      contentType: file.mimetype,
    });

    console.log('[UploadService] 上传成功, fileKey:', fileKey);

    // 生成签名 URL（有效期 7 天）
    const url = await this.storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 7 * 24 * 3600,
    });

    console.log('[UploadService] 生成签名 URL 成功');

    return { fileKey, url };
  }

  /**
   * 根据文件 key 生成签名 URL
   * @param fileKey 文件 key
   * @param expireTime 过期时间（秒），默认 7 天
   * @returns 签名 URL
   */
  async getFileUrl(fileKey: string, expireTime: number = 7 * 24 * 3600): Promise<string> {
    return this.storage.generatePresignedUrl({
      key: fileKey,
      expireTime,
    });
  }
}

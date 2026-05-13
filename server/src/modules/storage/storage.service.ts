import { Injectable } from '@nestjs/common';
import { S3Storage } from 'coze-coding-dev-sdk';

@Injectable()
export class StorageService {
  private storage: S3Storage;

  constructor() {
    this.storage = new S3Storage();
  }

  async uploadAvatar(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const result = await this.storage.uploadFile({
      fileContent: file.buffer,
      fileName: `avatar_${Date.now()}_${file.originalname}`,
      contentType: file.mimetype,
    });

    // result is the object key string
    const url = await this.storage.generatePresignedUrl({
      key: result as string,
      expireTime: 86400 * 365, // 1 year
    });

    return url;
  }
}

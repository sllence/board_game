import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../storage/database'
import { sessionPhotos } from '../../storage/database/shared/schema'
import { StorageClient } from '@coze-coding-dev-sdk/storage'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class SessionPhotosService {
  private storage: StorageClient

  constructor() {
    const accessKeyId = process.env.TOS_ACCESS_KEY_ID || ''
    const secretAccessKey = process.env.TOS_SECRET_ACCESS_KEY || ''
    const bucket = process.env.TOS_BUCKET || ''
    const endpoint = process.env.TOS_ENDPOINT || ''
    const region = process.env.TOS_REGION || 'cn-beijing'

    this.storage = new StorageClient({
      type: 's3',
      s3: {
        accessKeyId,
        secretAccessKey,
        bucket,
        endpoint,
        region,
        forcePathStyle: false,
      },
    })
  }

  async findBySession(sessionId: number) {
    return db
      .select()
      .from(sessionPhotos)
      .where(eq(sessionPhotos.sessionId, sessionId))
      .orderBy(desc(sessionPhotos.createdAt))
  }

  async uploadPhoto(
    sessionId: number,
    file: Express.Multer.File,
    options?: { userId?: number | null; caption?: string },
  ) {
    if (!file) throw new BadRequestException('请选择要上传的图片')
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('仅支持图片文件')
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg'
    const key = `session-photos/${sessionId}/${Date.now()}_${uuidv4().slice(0, 8)}.${ext}`

    try {
      await this.storage.putObject({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      })
    } catch (e) {
      console.error('上传图片失败:', e)
      throw new BadRequestException('图片上传失败，请稍后重试')
    }

    const url = `${process.env.TOS_PUBLIC_URL || 'https://' + process.env.TOS_BUCKET + '.' + process.env.TOS_ENDPOINT}/${key}`

    const [photo] = await db
      .insert(sessionPhotos)
      .values({
        sessionId,
        userId: options?.userId || null,
        fileKey: key,
        url,
        caption: options?.caption || null,
      })
      .returning('*')

    return photo
  }

  async deletePhoto(sessionId: number, photoId: number) {
    const photos = await db
      .select()
      .from(sessionPhotos)
      .where(eq(sessionPhotos.id, photoId))

    if (!photos.length || photos[0].sessionId !== sessionId) {
      throw new NotFoundException('照片不存在')
    }

    const photo = photos[0]

    try {
      await this.storage.deleteObject({ key: photo.fileKey })
    } catch (e) {
      console.error('删除文件失败，继续删除记录:', e)
    }

    await db.delete(sessionPhotos).where(eq(sessionPhotos.id, photoId))
    return { success: true }
  }
}

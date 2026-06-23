import { Injectable } from '@nestjs/common'
import { getSupabaseClient } from '@/storage/database/supabase-client'
import { UploadService } from '../upload/upload.service'

@Injectable()
export class SessionPhotosService {
  private get sb() {
    return getSupabaseClient()
  }

  constructor(private readonly uploadService: UploadService) {}

  async findBySession(sessionId: number) {
    const { data, error } = await this.sb
      .from('session_photos')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async upload(sessionId: number, userId: number, file: Express.Multer.File, caption?: string) {
    const { fileKey, url } = await this.uploadService.uploadFile(file)
    const { data, error } = await this.sb
      .from('session_photos')
      .insert({ session_id: sessionId, user_id: userId, file_key: fileKey, url, caption: caption || null })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: number) {
    const { data, error } = await this.sb
      .from('session_photos')
      .delete()
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
import { apiUpload, apiPut } from './request'

interface ProfileUser {
  id: number
  nickname?: string
  avatar_url?: string
  total_games?: number
  total_wins?: number
  total_time?: number
  is_admin?: boolean
  [key: string]: unknown
}

export async function uploadAvatar(filePath: string, userId: number): Promise<string> {
  const uploadRes = await apiUpload<Record<string, unknown>>(
    '/api/user/avatar',
    filePath,
    'file',
    { user_id: String(userId) },
  )
  const nested = uploadRes.data as Record<string, unknown> | undefined
  return (
    (nested?.avatar_url as string) ||
    (nested?.url as string) ||
    (uploadRes.avatar_url as string) ||
    (uploadRes.url as string) ||
    ''
  )
}

export async function saveProfile(
  userId: number,
  nickname: string,
  avatarUrl: string,
): Promise<ProfileUser> {
  await apiPut('/api/user/profile', {
    user_id: userId,
    nickname,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  })
  return { id: userId, nickname, avatar_url: avatarUrl }
}

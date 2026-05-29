export const TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  strategy: { label: '策略', emoji: '♟️', color: '#4F46E5', bg: '#eef2ff' },
  puzzle: { label: '益智', emoji: '🧩', color: '#0EA5E9', bg: '#f0f9ff' },
  auction: { label: '拍卖', emoji: '🔨', color: '#F59E0B', bg: '#fffbeb' },
  roleplay: { label: '扮演', emoji: '🎭', color: '#8B5CF6', bg: '#faf5ff' },
  management: { label: '经营', emoji: '🏗️', color: '#10B981', bg: '#ecfdf5' },
  cooperative: { label: '合作', emoji: '🤝', color: '#06B6D4', bg: '#ecfeff' },
  versus: { label: '对抗', emoji: '⚔️', color: '#EF4444', bg: '#fef2f2' },
  social: { label: '社交', emoji: '💬', color: '#F59E0B', bg: '#fffbeb' },
  party: { label: '聚会', emoji: '🎉', color: '#8B5CF6', bg: '#faf5ff' },
}

export const SCENE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  gathering: { label: '聚会', emoji: '🎉', color: '#7c3aed', bg: '#f5f3ff' },
  teambuilding: { label: '团建', emoji: '🏢', color: '#0891b2', bg: '#ecfeff' },
  family: { label: '亲子', emoji: '👨‍👩‍👧', color: '#059669', bg: '#ecfdf5' },
  couple: { label: '情侣', emoji: '💑', color: '#e11d48', bg: '#fff1f2' },
  drinking: { label: '酒局', emoji: '🍻', color: '#d97706', bg: '#fffbeb' },
}

export const DIFFICULTY_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  easy: { label: '简单', emoji: '🟢', color: '#059669', bg: '#ecfdf5' },
  medium: { label: '中等', emoji: '🟡', color: '#d97706', bg: '#fffbeb' },
  hard: { label: '困难', emoji: '🔴', color: '#dc2626', bg: '#fef2f2' },
}

export const ICON_KEY_MAP: Record<string, string> = {
  castle: '🏰',
  gem: '💎',
  moon: '🌙',
  shield: '🛡️',
  landmark: '🏛️',
  wheat: '🌾',
}

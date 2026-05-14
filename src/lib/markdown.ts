import { marked } from 'marked'

export const markdownToRichText = (text: string): string => {
  if (!text) return ''
  try {
    let html = marked.parse(text, { breaks: true, gfm: true }) as string

    // 图片打断有序列表时 marked 会生成 <ol start="N">，Taro RichText 不支持 start，手动补 value
    html = html.replace(/<ol(?: start="(\d+)")?[^>]*>([\s\S]*?)<\/ol>/g, (_, start, inner) => {
      let counter = start ? parseInt(start, 10) : 1
      const items = inner.replace(/<li>([\s\S]*?)<\/li>/g, (_m: string, content: string) => {
        return `<li value="${counter++}">${content}</li>`
      })
      return `<ol>${items}</ol>`
    })

    html = html
      .replace(/<h1>/g, '<h1 style="font-size:20px;font-weight:700;color:#1e1b4b;margin:16px 0 8px;">')
      .replace(/<h2>/g, '<h2 style="font-size:17px;font-weight:700;color:#1e1b4b;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">')
      .replace(/<h3>/g, '<h3 style="font-size:15px;font-weight:600;color:#374151;margin:16px 0 6px;">')
      .replace(/<p>/g, '<p style="font-size:14px;color:#374151;line-height:1.8;margin:6px 0;">')
      .replace(/<ul>/g, '<ul style="margin:6px 0;padding-left:20px;list-style-type:disc;">')
      .replace(/<ol>/g, '<ol style="margin:6px 0;padding-left:20px;list-style-type:decimal;">')
      .replace(/<li>/g, '<li style="font-size:14px;color:#374151;line-height:1.8;margin:3px 0;">')
      .replace(/<li value="(\d+)">/g, '<li value="$1" style="font-size:14px;color:#374151;line-height:1.8;margin:3px 0;">')
      .replace(/<strong>/g, '<strong style="font-weight:600;color:#1e1b4b;">')
      .replace(/<em>/g, '<em style="font-style:italic;color:#6b7280;">')
      .replace(/<blockquote>/g, '<blockquote style="margin:10px 0;padding:10px 14px;background:#f3f4f6;border-left:3px solid #8b5cf6;border-radius:0 8px 8px 0;">')
      .replace(/<hr>/g, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">')
      .replace(/<code>/g, '<code style="font-size:12px;background:#f3f4f6;padding:1px 5px;border-radius:4px;color:#7c3aed;">')
      .replace(/<img /g, '<img style="display:block;max-width:100%;border-radius:8px;margin:10px 0;" ')

    return html
  } catch (error) {
    console.error('[markdown] parse error:', error)
    return text.replace(/\n/g, '<br/>')
  }
}

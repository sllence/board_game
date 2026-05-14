/**
 * 轻量 Markdown → HTML 转换器（小程序兼容版）
 * 不依赖 marked 等第三方库，避免 \p{L}\p{N} 等正则在微信小程序中报错
 */

export const markdownToRichText = (text: string): string => {
  if (!text) return ''
  try {
    // 按行处理，识别块级元素
    const lines = text.split('\n')
    const result: string[] = []
    let inUl = false
    let inOl = false
    let olCounter = 1

    const closeList = () => {
      if (inUl) { result.push('</ul>'); inUl = false }
      if (inOl) { result.push('</ol>'); inOl = false; olCounter = 1 }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 图片行 ![alt](url)
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/)
      if (imgMatch) {
        closeList()
        const alt = imgMatch[1] || '图片'
        const url = imgMatch[2]
        result.push(`<img src="${url}" alt="${alt}" style="display:block;max-width:100%;border-radius:8px;margin:10px 0;" />`)
        continue
      }

      // 标题
      const hMatch = line.match(/^(#{1,6})\s+(.+)/)
      if (hMatch) {
        closeList()
        const level = hMatch[1].length
        const content = inlineFormat(hMatch[2])
        const styles: Record<number, string> = {
          1: 'font-size:20px;font-weight:700;color:#1e1b4b;margin:16px 0 8px;',
          2: 'font-size:17px;font-weight:700;color:#1e1b4b;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;',
          3: 'font-size:15px;font-weight:600;color:#374151;margin:16px 0 6px;',
          4: 'font-size:14px;font-weight:600;color:#374151;margin:12px 0 4px;',
          5: 'font-size:13px;font-weight:600;color:#374151;margin:10px 0 4px;',
          6: 'font-size:12px;font-weight:600;color:#374151;margin:8px 0 4px;',
        }
        result.push(`<h${level} style="${styles[level]}">${content}</h${level}>`)
        continue
      }

      // 水平线
      if (/^[-*_]{3,}\s*$/.test(line)) {
        closeList()
        result.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />')
        continue
      }

      // 无序列表
      const ulMatch = line.match(/^[-*+]\s+(.+)/)
      if (ulMatch) {
        if (inOl) { result.push('</ol>'); inOl = false; olCounter = 1 }
        if (!inUl) { result.push('<ul style="margin:6px 0;padding-left:20px;list-style-type:disc;">'); inUl = true }
        result.push(`<li style="font-size:14px;color:#374151;line-height:1.8;margin:3px 0;">${inlineFormat(ulMatch[1])}</li>`)
        continue
      }

      // 有序列表
      const olMatch = line.match(/^\d+[.)]\s+(.+)/)
      if (olMatch) {
        if (inUl) { result.push('</ul>'); inUl = false }
        if (!inOl) { result.push('<ol style="margin:6px 0;padding-left:20px;list-style-type:decimal;">'); inOl = true; olCounter = 1 }
        result.push(`<li value="${olCounter++}" style="font-size:14px;color:#374151;line-height:1.8;margin:3px 0;">${inlineFormat(olMatch[1])}</li>`)
        continue
      }

      // 引用
      const bqMatch = line.match(/^>\s?(.*)/)
      if (bqMatch) {
        closeList()
        result.push(`<blockquote style="margin:10px 0;padding:10px 14px;background:#f3f4f6;border-left:3px solid #8b5cf6;border-radius:0 8px 8px 0;">${inlineFormat(bqMatch[1])}</blockquote>`)
        continue
      }

      // 空行
      if (line.trim() === '') {
        closeList()
        continue
      }

      // 普通段落
      closeList()
      result.push(`<p style="font-size:14px;color:#374151;line-height:1.8;margin:6px 0;">${inlineFormat(line)}</p>`)
    }

    closeList()
    return result.join('')
  } catch (error) {
    console.error('[markdown] parse error:', error)
    return text.replace(/\n/g, '<br/>')
  }
}

/** 行内格式：粗体、斜体、行内代码、链接 */
function inlineFormat(text: string): string {
  // 保留已有 HTML 标签（如 img），不转义标签内部
  // 先把 HTML 标签提取出来
  const tags: string[] = []
  let safe = text.replace(/<(img|br|hr)\s*[^>]*\/?>/gi, (match) => {
    tags.push(match)
    return `__TAG${tags.length - 1}__`
  })

  // 转义剩余 HTML
  safe = safe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 行内代码 `code`
  safe = safe.replace(/`([^`]+)`/g, '<code style="font-size:12px;background:#f3f4f6;padding:1px 5px;border-radius:4px;color:#7c3aed;">$1</code>')

  // 粗体 **text** 或 __text__
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#1e1b4b;">$1</strong>')
  safe = safe.replace(/__(.+?)__/g, '<strong style="font-weight:600;color:#1e1b4b;">$1</strong>')

  // 斜体 *text* 或 _text_（避免和粗体冲突，要求非 * 开头）
  safe = safe.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em style="font-style:italic;color:#6b7280;">$1</em>')
  safe = safe.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em style="font-style:italic;color:#6b7280;">$1</em>')

  // 链接 [text](url)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#8b5cf6;text-decoration:underline;">$1</a>')

  // 还原 HTML 标签
  safe = safe.replace(/__TAG(\d+)__/g, (_, i) => tags[parseInt(i)])

  return safe
}

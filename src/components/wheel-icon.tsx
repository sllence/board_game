import { Image } from '@tarojs/components'

interface WheelIconProps {
  size?: number
  color?: string
  className?: string
}

export function WheelIcon({ size = 24, color = '#f59e0b', className = '' }: WheelIconProps) {
  // 5等分扇区，每个72度，从顶部(-90度)开始
  const cx = 12
  const cy = 12
  const r = 9

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const px = (deg: number) => cx + r * Math.cos(toRad(deg))
  const py = (deg: number) => cy + r * Math.sin(toRad(deg))

  // 5个扇区的起始和结束角度
  const sectors = [
    { start: 270, end: 342 },
    { start: 342, end: 54 },
    { start: 54, end: 126 },
    { start: 126, end: 198 },
    { start: 198, end: 270 },
  ]

  // 构建每个扇区的 SVG path
  const sectorPaths = sectors.map((s) => {
    const sx = px(s.start)
    const sy = py(s.start)
    const ex = px(s.end)
    const ey = py(s.end)
    // 大弧标志：72度 < 180，所以是0
    // sweep-flag: 1 (顺时针)
    return `M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z`
  })

  // 交替填充色：奇数扇区白色，偶数扇区用传入颜色的 12% 透明度
  const altFill = (i: number) => i % 2 === 0 ? 'white' : color + '20'

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      ${sectorPaths.map((d, i) => `
        <path d="${d}" fill="${altFill(i)}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      `).join('')}
      <!-- 外圈轮廓 -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5"/>
      <!-- 中心圆 -->
      <circle cx="${cx}" cy="${cy}" r="2.5" fill="white" stroke="${color}" stroke-width="1.5"/>
      <!-- 顶部指针 -->
      <path d="M 12 1 L 13.5 4.5 L 10.5 4.5 Z" fill="${color}"/>
    </svg>
  `

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`

  return <Image src={dataUrl} style={{ width: size, height: size }} className={className} />
}

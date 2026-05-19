import { Image } from '@tarojs/components'

interface WheelIconProps {
  size?: number
  color?: string
  className?: string
}

export function WheelIcon({ size = 24, color = '#f59e0b', className = '' }: WheelIconProps) {
  // 5等分扇区，每个72度，从顶部(-90度)开始
  const sectors = []
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 1
  
  for (let i = 0; i < 5; i++) {
    const startAngle = -90 + i * 72
    const endAngle = -90 + (i + 1) * 72
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    
    const largeArcFlag = 72 > 180 ? 1 : 0
    
    // 扇区路径：从圆心 -> 起始点 -> 圆弧 -> 结束点 -> 圆心
    const path = `
      M ${centerX} ${centerY}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `
    
    sectors.push(
      <path
        key={i}
        d={path}
        fill="transparent"
        stroke={color}
        strokeWidth="3"
      />
    )
  }
  
  // 将 SVG 转为 data URI
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="transparent" stroke="${color}" strokeWidth="3" />
      ${sectors.map(s => s.props.d ? `<path d="${s.props.d}" fill="transparent" stroke="${color}" strokeWidth="3" />` : '').join('')}
    </svg>
  `
  const encodedSvg = encodeURIComponent(svgContent)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  const dataUrl = `data:image/svg+xml,${encodedSvg}`
  
  return <Image src={dataUrl} className={className} style={{ width: size, height: size }} />
}

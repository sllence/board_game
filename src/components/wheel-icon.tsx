import { Image } from '@tarojs/components'

interface WheelIconProps {
  size?: number
  color?: string
  className?: string
}

export function WheelIcon({ size = 24, color = '#f59e0b', className = '' }: WheelIconProps) {
  const centerX = size / 2
  const centerY = size / 2
  const radius = size / 2 - 2
  const strokeWidth = 2
  
  // 5条半径分割线，细线条风格
  const lines = []
  
  for (let i = 0; i < 5; i++) {
    const angle = -90 + i * 72
    const rad = (angle * Math.PI) / 180
    const x = centerX + radius * Math.cos(rad)
    const y = centerY + radius * Math.sin(rad)
    
    lines.push(
      <line
        key={i}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    )
  }
  
  // 将 SVG 转为 data URI
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" />
      ${lines.map(l => `<line x1="${l.props.x1}" y1="${l.props.y1}" x2="${l.props.x2}" y2="${l.props.y2}" />`).join('')}
    </svg>
  `
  const encodedSvg = encodeURIComponent(svgContent)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  const dataUrl = `data:image/svg+xml,${encodedSvg}`
  
  return <Image src={dataUrl} className={className} style={{ width: size, height: size }} />
}

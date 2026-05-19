import { Image } from '@tarojs/components'

interface WheelIconProps {
  size?: number
  color?: string
  className?: string
}

export function WheelIcon({ size = 24, color = '#f59e0b', className = '' }: WheelIconProps) {
  const segments = [
    '#f59e0b',
    '#ef4444',
    '#6366f1',
    '#10b981',
  ]

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="${color}" stroke-width="1.5" fill="none"/>
      <path d="M12 3 L12 12" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M12 12 L20.2 7.5" stroke="${segments[0]}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <path d="M12 12 L20.2 16.5" stroke="${segments[1]}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <path d="M12 12 L3.8 16.5" stroke="${segments[2]}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <path d="M12 12 L3.8 7.5" stroke="${segments[3]}" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
      <circle cx="12" cy="12" r="2.5" fill="${color}"/>
      <path d="M12 1.5 L13.5 4.5 L10.5 4.5 Z" fill="${color}"/>
    </svg>
  `

  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`

  return <Image src={dataUrl} style={{ width: size, height: size }} className={className} />
}

import type * as THREE from 'three-platformize'
import type * as CANNON from 'cannon-es'

export type DiceType = 'D4' | 'D6' | 'D8' | 'D12' | 'D20'

export interface DiceColor {
  key: string
  label: string
  bgColor: [number, number, number]
  dotColor: [number, number, number]
}

export interface DiceTheme {
  key: string
  label: string
  pageBg: string
  sceneBg: number
  groundColor: number
  textColor: string
  subTextColor: string
}

export interface DiceDefinition {
  createMesh(color: DiceColor): THREE.Mesh
  createBody(): CANNON.Body
  faceNormals: CANNON.Vec3[]
  getFaceValue(faceIndex: number): number
  dispose(mesh: THREE.Mesh): void
}

export const DICE_COLORS: DiceColor[] = [
  { key: 'white', label: '白色', bgColor: [0xFF, 0xFF, 0xFF], dotColor: [0x1A, 0x1A, 0x1A] },
  { key: 'black', label: '黑色', bgColor: [0x1A, 0x1A, 0x1A], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'red', label: '红色', bgColor: [0xDC, 0x26, 0x26], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'blue', label: '蓝色', bgColor: [0x25, 0x63, 0xEB], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'green', label: '绿色', bgColor: [0x16, 0xA3, 0x4A], dotColor: [0xFF, 0xFF, 0xFF] },
  { key: 'purple', label: '紫色', bgColor: [0x93, 0x33, 0xEA], dotColor: [0xFF, 0xFF, 0xFF] },
]

export const DICE_THEMES: DiceTheme[] = [
  { key: 'white', label: '白色', pageBg: '#f5f5f7', sceneBg: 0xf5f5f7, groundColor: 0xf5f5f7, textColor: '#1A1A1A', subTextColor: '#6B7280' },
  { key: 'black', label: '黑色', pageBg: '#1A1A2E', sceneBg: 0x1A1A2E, groundColor: 0x1A1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'red', label: '红色', pageBg: '#2D1A1A', sceneBg: 0x2D1A1A, groundColor: 0x2D1A1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'blue', label: '蓝色', pageBg: '#1A1A3D', sceneBg: 0x1A1A3D, groundColor: 0x1A1A3D, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'green', label: '绿色', pageBg: '#1A2D1A', sceneBg: 0x1A2D1A, groundColor: 0x1A2D1A, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
  { key: 'purple', label: '紫色', pageBg: '#2D1A2E', sceneBg: 0x2D1A2E, groundColor: 0x2D1A2E, textColor: '#FFFFFF', subTextColor: '#9CA3AF' },
]

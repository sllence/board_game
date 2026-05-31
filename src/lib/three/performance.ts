// src/lib/three/performance.ts

export type PerformanceLevel = 'high' | 'medium' | 'low'

interface PerformanceMetrics {
  fps: number
  level: PerformanceLevel
}

export class PerformanceMonitor {
  private frameCount: number = 0
  private lastTime: number = performance.now()
  private fps: number = 60
  private level: PerformanceLevel = 'high'
  private onLevelChange?: (level: PerformanceLevel) => void
  private lastLevelChangeTime: number = 0
  private fpsHistory: number[] = []

  constructor(onLevelChange?: (level: PerformanceLevel) => void) {
    this.onLevelChange = onLevelChange
  }

  update(): void {
    this.frameCount++
    const now = performance.now()
    const delta = now - this.lastTime

    if (delta >= 1000) {
      const currentFps = (this.frameCount * 1000) / delta
      this.fpsHistory.push(currentFps)
      if (this.fpsHistory.length > 3) {
        this.fpsHistory.shift()
      }
      this.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.frameCount = 0
      this.lastTime = now
      this.updateLevel(now)
    }
  }

  private updateLevel(now: number): void {
    if (now - this.lastLevelChangeTime < 2000) return

    let newLevel: PerformanceLevel

    if (this.fps >= 50) {
      newLevel = 'high'
    } else if (this.fps >= 25) {
      newLevel = 'medium'
    } else {
      newLevel = 'low'
    }

    if (newLevel !== this.level) {
      this.level = newLevel
      this.lastLevelChangeTime = now
      this.onLevelChange?.(this.level)
    }
  }

  getMetrics(): PerformanceMetrics {
    return { fps: this.fps, level: this.level }
  }

  getLevel(): PerformanceLevel {
    return this.level
  }

  dispose(): void {
    this.fpsHistory = []
  }
}

// 根据性能等级配置特效
export function getEffectsConfig(level: PerformanceLevel) {
  switch (level) {
    case 'high':
      return {
        enableTrail: true,
        enableSpark: true,
        enableGlow: true,
        enableAmbient: true,
        enableShadow: true,
        enablePostProcessing: true,
        trailCount: 8,
        sparkCount: 25,
        ambientCount: 80,
      }
    case 'medium':
      return {
        enableTrail: true,
        enableSpark: true,
        enableGlow: true,
        enableAmbient: false,
        enableShadow: true,
        enablePostProcessing: false,
        trailCount: 5,
        sparkCount: 15,
        ambientCount: 0,
      }
    case 'low':
      return {
        enableTrail: false,
        enableSpark: true,
        enableGlow: false,
        enableAmbient: false,
        enableShadow: false,
        enablePostProcessing: false,
        trailCount: 0,
        sparkCount: 10,
        ambientCount: 0,
      }
  }
}

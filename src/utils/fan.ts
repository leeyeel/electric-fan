export const FAN_SPEEDS = [0, 360, 1080, 2160] as const
export const FAN_LEVEL_NAMES = ['已关闭', '一档 · 轻风', '二档 · 凉风', '三档 · 强风']
export const MAX_FAN_SPEED = FAN_SPEEDS[3]

// Integrate acceleration so the result is independent of the display refresh rate.
export function advanceFan(speed: number, rotation: number, level: number, elapsed: number) {
  const target = FAN_SPEEDS[level] || 0
  const acceleration = target > speed ? 780 : 540
  const direction = Math.sign(target - speed)
  const rampTime = Math.min(elapsed, Math.abs(target - speed) / acceleration)
  const nextSpeed = Math.abs(target - speed) <= acceleration * elapsed
    ? target
    : speed + direction * acceleration * elapsed
  const distance = (speed + nextSpeed) * rampTime / 2 + target * (elapsed - rampTime)

  return {
    speed: nextSpeed,
    rotation: (rotation + distance) % 360,
  }
}

// A short visual exposure: faster blades sweep wider arcs instead of strobing.
export function fanExposure(speed: number) {
  const strength = Math.min(1, Math.max(0, speed / MAX_FAN_SPEED))
  return {
    angle: speed / 24,
    trailOpacity: strength * 0.075,
    bladeOpacity: 1 - strength * 0.88,
    discOpacity: strength * strength * 0.12,
    blur: strength * 0.7,
  }
}

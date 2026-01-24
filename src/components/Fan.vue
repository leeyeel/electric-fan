<template>
  <div id="fan">
    <div class="fan-header">
      <div ref="leafsRef" class="leafs" :style="{ transform: `rotate(${currentRotation}deg)` }">
        <div class="circle"></div>
        <div class="leaf-1"></div>
        <div class="leaf-2"></div>
        <div class="leaf-3"></div>
      </div>
    </div>
    <div class="fan-neck"></div>
    <div class="fan-footer"></div>
  </div>
  <FanSwitch />
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { store } from '~/stores'

// 旋转角度（持续累积，永不重置）
const currentRotation = ref(0)
const leafsRef = ref<HTMLElement | null>(null)

// 速度配置（度/秒）
const speedConfig = {
  0: 0,      // 停止
  1: 545,    // 120度 / 0.22秒 ≈ 545度/秒
  2: 706,    // 120度 / 0.17秒 ≈ 706度/秒
  3: 1333,   // 120度 / 0.09秒 ≈ 1333度/秒
}

// 加速度配置（度/秒²）
// 在约7.5秒内从0加速到最高速度1333度/秒
const ACCELERATION = 180
// 减速度配置（度/秒²），稍快于加速度，更真实
const DECELERATION = 240

// 当前速度（度/秒）
let currentSpeed = 0
// 目标速度（度/秒）
let targetSpeed = 0

let animationId: number | null = null
let lastTime: number | null = null

// 动画循环
const animate = (timestamp: number) => {
  if (lastTime === null) {
    lastTime = timestamp
  }

  const deltaTime = (timestamp - lastTime) / 1000 // 转换为秒
  lastTime = timestamp

  // 计算当前应该达到的目标速度
  const level = store.state.level
  targetSpeed = speedConfig[level as keyof typeof speedConfig]

  if (Math.abs(currentSpeed - targetSpeed) < 1) {
    // 已接近目标速度，直接使用目标速度
    currentSpeed = targetSpeed

    if (targetSpeed === 0) {
      // 完全停止
      animationId = null
      lastTime = null
      currentRotation.value = Math.round(currentRotation.value) // 修正到整数角度
      return
    }
  } else if (currentSpeed < targetSpeed) {
    // 加速
    currentSpeed += ACCELERATION * deltaTime
    // 防止超调
    if (currentSpeed > targetSpeed) {
      currentSpeed = targetSpeed
    }
  } else {
    // 减速
    currentSpeed -= DECELERATION * deltaTime
    // 防止超调
    if (currentSpeed < targetSpeed) {
      currentSpeed = targetSpeed
    }
  }

  // 更新旋转角度
  currentRotation.value += currentSpeed * deltaTime

  animationId = requestAnimationFrame(animate)
}

// 监听档位变化
watch(() => store.state.level, () => {
  // 如果动画未运行，启动它
  if (animationId === null) {
    lastTime = null
    animationId = requestAnimationFrame(animate)
  }
}, { immediate: true })

// 组件卸载时清理动画
onUnmounted(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style lang="scss">
@import '~/styles/fan.scss';
</style>

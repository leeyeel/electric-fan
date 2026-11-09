<template>
  <div id="fan">
    <svg class="fan-drawing" viewBox="0 0 280 360" role="img" :aria-label="`电风扇，${levelName}`">
      <defs>
        <path
          id="fan-blade"
          d="M 137 123 C 119 108 107 86 112 62 C 117 40 141 31 163 44 C 188 59 193 83 177 102 C 167 114 151 122 137 123 Z"
        />
        <g id="fan-rotor">
          <use href="#fan-blade" />
          <use href="#fan-blade" transform="rotate(120 140 130)" />
          <use href="#fan-blade" transform="rotate(240 140 130)" />
        </g>
        <radialGradient id="fan-disc">
          <stop offset="0.16" stop-color="currentColor" stop-opacity="0" />
          <stop offset="0.55" stop-color="currentColor" stop-opacity="0.3" />
          <stop offset="0.86" stop-color="currentColor" stop-opacity="1" />
          <stop offset="1" stop-color="currentColor" stop-opacity="0" />
        </radialGradient>
      </defs>

      <path class="fan-stand" d="M 133 244 L 131 317 L 149 317 L 147 244 Z" />
      <path class="fan-base" d="M 71 327 Q 71 316 89 315 L 191 315 Q 209 316 209 327 Z" />
      <circle class="fan-shell" cx="140" cy="130" r="115" />
      <circle class="fan-rim" cx="140" cy="130" r="105" />

      <circle cx="140" cy="130" r="99" fill="url(#fan-disc)" :opacity="exposure.discOpacity" />
      <g
        class="fan-moving-blades"
        :transform="`rotate(${rotation} 140 130)`"
        :style="{ filter: exposure.blur > 0 ? `blur(${exposure.blur}px)` : undefined }"
      >
        <!-- Exposure samples follow the previous positions of the actual rotor. -->
        <g v-if="speed > 0" class="fan-trails">
          <use
            v-for="sample in trailSamples"
            :key="sample"
            href="#fan-rotor"
            :transform="`rotate(${-exposure.angle * sample / trailSamples} 140 130)`"
            :opacity="exposure.trailOpacity"
          />
        </g>
        <use class="fan-sharp-blades" href="#fan-rotor" :opacity="exposure.bladeOpacity" />
      </g>

      <g class="fan-grille">
        <circle v-for="radius in [44, 72, 98]" :key="radius" cx="140" cy="130" :r="radius" />
        <path
          v-for="spoke in 8"
          :key="spoke"
          d="M 140 113 L 140 25"
          :transform="`rotate(${spoke * 45} 140 130)`"
        />
      </g>
      <circle class="fan-hub" cx="140" cy="130" r="16" />
      <circle class="fan-hub-dot" cx="140" cy="130" r="4" />
    </svg>
    <p class="fan-status" role="status">
      <span class="fan-wind-bars" :class="{ 'is-coasting': isCoasting }" aria-hidden="true">
        <span v-for="bar in 3" :key="bar" :class="{ 'is-on': store.state.level >= bar }"></span>
      </span>
      {{ isCoasting ? '正在缓缓停下' : levelName }}
    </p>
  </div>
  <FanSwitch />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { store } from '~/stores'
import { advanceFan, fanExposure, FAN_LEVEL_NAMES } from '~/utils/fan'

const rotation = ref(0)
const speed = computed(() => store.state.speed)
const exposure = computed(() => fanExposure(speed.value))
const levelName = computed(() => FAN_LEVEL_NAMES[store.state.level])
const isCoasting = computed(() => store.state.level === 0 && speed.value > 0)
const trailSamples = 18
let animationId: number | null = null
let lastTime: number | null = null

function animate(timestamp: number) {
  // Discard long gaps after a background tab resumes, avoiding a sudden jump.
  const elapsed = lastTime === null ? 0 : Math.min((timestamp - lastTime) / 1000, 0.05)
  lastTime = timestamp
  const next = advanceFan(speed.value, rotation.value, store.state.level, elapsed)
  store.state.speed = next.speed
  rotation.value = next.rotation

  if (next.speed === 0 && store.state.level === 0) {
    animationId = null
    lastTime = null
    return
  }
  animationId = requestAnimationFrame(animate)
}

function startAnimation() {
  const level = store.state.level
  if (animationId === null && (level > 0 || speed.value > 0))
    animationId = requestAnimationFrame(animate)
}

watch(() => store.state.level, startAnimation)
onMounted(startAnimation)

onUnmounted(() => {
  if (animationId !== null)
    cancelAnimationFrame(animationId)
  store.state.speed = 0
})
</script>

<style lang="scss">
@use '~/styles/fan.scss';
</style>

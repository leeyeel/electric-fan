<template>
  <div class="fan-controls" role="group" aria-label="风扇档位">
    <button
      v-for="item in switchItems"
      :key="item.value"
      type="button"
      class="fan-btn"
      :class="{ 'is-active': item.value === store.state.level }"
      :aria-label="item.label"
      :aria-pressed="item.value === store.state.level"
      :title="item.label"
      @click="changeLevel(item.value)"
    >
      {{ item.name }}
    </button>
  </div>
  <p v-if="audioError" class="fan-audio-error" role="status">
    {{ audioError }}
    <button type="button" @click="changeLevel(store.state.level)">重试声音</button>
  </p>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { store } from '~/stores'
import { FanAudio } from '~/utils/fanAudio'

const switchItems = [
  { name: '关', label: '关闭风扇', value: 0 },
  { name: '1', label: '一档，轻风', value: 1 },
  { name: '2', label: '二档，凉风', value: 2 },
  { name: '3', label: '三档，强风', value: 3 },
]

const audioError = ref('')
const audio = new FanAudio((message) => { audioError.value = message })

function changeLevel(level: number) {
  store.setLevel(level)
  void audio.selectLevel(level)
}

watch(() => store.state.speed, speed => audio.updateSpeed(speed))
onUnmounted(() => audio.dispose())
</script>

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

function buffer(channels = 2, length = 7000, sampleRate = 1000) {
  const data = Array.from({ length: channels }, () => new Float32Array(length))
  return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (i: number) => data[i] }
}

function gainNode() {
  return { gain: { value: 0, setTargetAtTime: vi.fn<(value: number, time: number, constant: number) => void>() }, connect: vi.fn(), disconnect: vi.fn() }
}

function sourceNode() {
  return {
    buffer: buffer(),
    loop: false,
    playbackRate: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

class Context {
  static instances: Context[] = []
  static blocked = false
  sources: ReturnType<typeof sourceNode>[] = []
  gains: ReturnType<typeof gainNode>[] = []
  state = 'suspended'
  currentTime = 0
  destination = {}
  events: string[] = []

  constructor() {
    Context.instances.push(this)
  }

  resume() {
    this.events.push('resume')
    if (Context.blocked)
      return Promise.reject(new Error('NotAllowedError'))
    this.state = 'running'
    return Promise.resolve()
  }

  createBuffer(...args: Parameters<typeof buffer>) { return buffer(...args) }
  decodeAudioData() { return Promise.resolve(buffer()) }

  createGain() {
    const node = gainNode()
    this.gains.push(node)
    return node
  }

  createBufferSource() {
    const node = sourceNode()
    this.sources.push(node)
    return node
  }
}

function response(ok = true) {
  return { ok, status: ok ? 200 : 404, arrayBuffer: async () => new ArrayBuffer(8) }
}

beforeEach(() => {
  vi.resetModules()
  Context.instances = []
  Context.blocked = false
  vi.stubEnv('BASE_URL', '/electric-fan/')
  vi.stubGlobal('window', { AudioContext: Context })
  vi.stubGlobal('fetch', vi.fn(async () => response()))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('cold loading unlocks during the gesture and uses the deployment base for both recordings', async () => {
  const audio = await import('../src/composables/audio')
  const pending = audio.unlockAudio()
  const ctx = Context.instances[0]
  expect(ctx.events[0]).toBe('resume')
  expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual([
    '/electric-fan/audio/fan.wav',
    '/electric-fan/audio/switch.mp3',
  ])
  audio.setHumLevel(1)
  await pending
  expect(ctx.sources).toHaveLength(1)
  expect(ctx.sources[0].loop).toBe(true)
  expect(ctx.sources[0].buffer.duration).toBeLessThan(3)
  audio.playClick()
  expect(ctx.sources).toHaveLength(2)
  expect(audio.audioError.value).toBe('')
})

it('switching off while downloading cannot start a stale hum', async () => {
  const requests: ((value: ReturnType<typeof response>) => void)[] = []
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => requests.push(resolve))))
  const audio = await import('../src/composables/audio')
  const pending = audio.unlockAudio()
  audio.setHumLevel(1)
  audio.setHumLevel(0)
  requests.forEach(resolve => resolve(response()))
  await pending
  expect(Context.instances[0].sources).toHaveLength(0)
})

it('failed downloads surface a retry and recover on the same audio graph', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(false)).mockResolvedValue(response()))
  const audio = await import('../src/composables/audio')
  audio.setHumLevel(1)
  await audio.unlockAudio()
  expect(audio.audioError.value).toContain('重试')
  await audio.unlockAudio()
  expect(audio.audioError.value).toBe('')
  expect(Context.instances).toHaveLength(1)
  expect(Context.instances[0].gains).toHaveLength(1)
  expect(Context.instances[0].sources).toHaveLength(1)
  expect(fetch).toHaveBeenCalledTimes(4)
})

it('autoplay rejection is handled and the next gesture reuses decoded buffers', async () => {
  const audio = await import('../src/composables/audio')
  Context.blocked = true
  audio.setHumLevel(1)
  await audio.unlockAudio()
  expect(audio.audioError.value).toContain('重试')
  expect(Context.instances[0].sources).toHaveLength(0)
  Context.blocked = false
  await audio.unlockAudio()
  expect(audio.audioError.value).toBe('')
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(Context.instances[0].sources).toHaveLength(1)
})

it('natural wind, voice ducking and mute share one hum that stops with the motor', async () => {
  const audio = await import('../src/composables/audio')
  await audio.unlockAudio()
  audio.setHumLevel(1)
  const ctx = Context.instances[0]
  const fullVolume = ctx.gains[0].gain.setTargetAtTime.mock.lastCall![0]
  audio.duckHum(true)
  expect(ctx.gains[0].gain.setTargetAtTime.mock.lastCall![0]).toBeLessThan(fullVolume)
  audio.duckHum(false)
  audio.setHumLevel(0.3)
  expect(ctx.gains[0].gain.setTargetAtTime.mock.lastCall![0]).toBeLessThan(fullVolume)
  expect(ctx.sources).toHaveLength(1)
  audio.setAudioMuted(true)
  audio.playClick()
  expect(ctx.sources).toHaveLength(1)
  expect(ctx.sources[0].stop).toHaveBeenCalledOnce()
  audio.setAudioMuted(false)
  expect(ctx.sources).toHaveLength(2)
  audio.setHumLevel(0)
  expect(ctx.sources[1].stop).toHaveBeenCalledOnce()
})

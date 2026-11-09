import { MAX_FAN_SPEED } from './fan'

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

// Blend the ends of the steady part of the recording for a seamless loop.
export function createFanLoop(context: AudioContext, recording: AudioBuffer) {
  const start = Math.floor(Math.min(3.5, recording.duration / 2) * recording.sampleRate)
  const end = Math.floor(Math.min(6, recording.duration - 1) * recording.sampleRate)
  const length = end - start
  if (length <= 0)
    return recording

  const fade = Math.min(Math.floor(recording.sampleRate * 0.12), Math.floor(length / 4))
  const loop = context.createBuffer(recording.numberOfChannels, length - fade, recording.sampleRate)
  for (let channel = 0; channel < recording.numberOfChannels; channel++) {
    const input = recording.getChannelData(channel)
    const output = loop.getChannelData(channel)
    output.set(input.subarray(start + fade, end))
    for (let i = 0; i < fade; i++) {
      const mix = i / fade
      const index = output.length - fade + i
      output[index] = output[index] * (1 - mix) + input[start + i] * mix
    }
  }
  return loop
}

export class FanAudio {
  private context: AudioContext | null = null
  private fan: AudioBufferSourceNode | null = null
  private gain: GainNode | null = null
  private buffers = new Map<string, Promise<AudioBuffer>>()
  private clicks = new Set<AudioBufferSourceNode>()
  private version = 0
  private speed = 0
  private powered = false
  private disposed = false

  constructor(private reportError: (message: string) => void) {}

  // Called directly from the button gesture, before any network or decoding await.
  async selectLevel(level: number) {
    if (this.disposed)
      return

    this.powered = level > 0
    const version = ++this.version
    this.reportError('')
    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext
        if (!AudioContextClass)
          throw new Error('Web Audio is unavailable')
        this.context = new AudioContextClass()
      }

      const context = this.context
      const ready = context.resume()
      const click = this.loadBuffer('switch.mp3')
      const recording = this.powered || this.speed > 0 ? this.loadBuffer('fan.wav') : null
      const [clickBuffer, fanBuffer] = await Promise.all([click, recording, ready])
      if (this.disposed || version !== this.version)
        return
      if (context.state !== 'running')
        throw new Error('Audio playback is suspended')

      const effect = context.createBufferSource()
      effect.buffer = clickBuffer
      effect.connect(context.destination)
      this.clicks.add(effect)
      effect.onended = () => {
        effect.disconnect()
        this.clicks.delete(effect)
      }
      effect.start()

      if (fanBuffer && !this.fan && (this.powered || this.speed > 0)) {
        this.fan = context.createBufferSource()
        this.fan.buffer = createFanLoop(context, fanBuffer)
        this.fan.loop = true
        this.gain = context.createGain()
        this.gain.gain.value = 0
        this.fan.connect(this.gain)
        this.gain.connect(context.destination)
        this.updateSpeed(this.speed)
        this.fan.start()
      }
      this.updateSpeed(this.speed)
    }
    catch (error) {
      if (!this.disposed && version === this.version) {
        this.reportError('声音暂时无法播放，请点击重试。')
        console.warn('Unable to play fan audio:', error)
      }
    }
  }

  updateSpeed(speed: number) {
    this.speed = speed
    if (!this.context || !this.fan || !this.gain)
      return
    if (speed === 0 && !this.powered) {
      this.fan.stop()
      this.fan.disconnect()
      this.gain.disconnect()
      this.fan = null
      this.gain = null
      return
    }
    const strength = Math.min(1, Math.max(0, speed / MAX_FAN_SPEED))
    this.fan.playbackRate.setTargetAtTime(0.65 + strength * 0.85, this.context.currentTime, 0.08)
    this.gain.gain.setTargetAtTime(Math.pow(strength, 0.65) * 0.65, this.context.currentTime, 0.08)
  }

  dispose() {
    this.disposed = true
    ++this.version
    this.fan?.stop()
    this.fan?.disconnect()
    this.gain?.disconnect()
    this.fan = null
    this.gain = null
    this.clicks.forEach(click => click.stop())
    this.clicks.clear()
    this.buffers.clear()
    if (this.context)
      void this.context.close().catch(() => {})
  }

  private loadBuffer(filename: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(filename)
    if (cached)
      return cached
    const context = this.context!
    const pending = fetch(`${import.meta.env.BASE_URL}audio/${filename}`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Audio request failed: ${response.status}`)
        return response.arrayBuffer()
      })
      .then(data => context.decodeAudioData(data))
      .catch((error) => {
        this.buffers.delete(filename)
        throw error
      })
    this.buffers.set(filename, pending)
    return pending
  }
}

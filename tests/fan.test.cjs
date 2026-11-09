const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const path = require('node:path')
const Module = require('node:module')
const fs = require('node:fs')
const { buildSync } = require('esbuild')

function loadAudio(base = '/') {
  const filename = path.resolve('src/utils/fanAudio.ts')
  const { outputFiles } = buildSync({
    entryPoints: [filename], bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'import.meta.env.BASE_URL': JSON.stringify(base) },
  })
  const loaded = new Module(filename, module)
  loaded._compile(outputFiles[0].text, filename)
  return loaded.exports
}
const { outputFiles } = buildSync({
  entryPoints: ['src/utils/fan.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
})
const motion = new Module(path.resolve('src/utils/fan.ts'), module)
motion._compile(outputFiles[0].text, path.resolve('src/utils/fan.ts'))
const { FAN_SPEEDS, advanceFan, fanExposure } = motion.exports

function run(state, level, seconds, hz) {
  for (let i = 0; i < seconds * hz; i++)
    state = advanceFan(state.speed, state.rotation, level, 1 / hz)
  return state
}

test('three distinct speeds settle exactly and acceleration is independent of refresh rate', () => {
  assert.deepEqual(FAN_SPEEDS, [0, 360, 1080, 2160])
  for (const level of [1, 2, 3]) {
    const reference = run({ speed: 0, rotation: 0 }, level, 4, 60)
    assert.equal(reference.speed, FAN_SPEEDS[level])
    for (const hz of [30, 120, 144]) {
      const actual = run({ speed: 0, rotation: 0 }, level, 4, hz)
      assert.equal(actual.speed, reference.speed)
      assert.ok(Math.abs(actual.rotation - reference.rotation) < 1e-8)
    }
  }
})

test('rapid speed changes preserve rotation and coast down to exact zero', () => {
  let state = run({ speed: 0, rotation: 7 }, 3, 1, 60)
  assert.ok(state.speed > 360 && state.speed < 2160)
  const previous = state
  state = advanceFan(state.speed, state.rotation, 1, 1 / 60)
  assert.ok(state.speed < previous.speed && state.speed > 360)
  assert.notEqual(state.rotation, 0)
  state = run(state, 0, 5, 60)
  assert.equal(state.speed, 0)
  assert.deepEqual(advanceFan(state.speed, state.rotation, 0, 0.05), state)
})

test('exposure becomes wider and softer at each level, and is clear when stopped', () => {
  const exposure = FAN_SPEEDS.map(fanExposure)
  assert.equal(exposure[0].bladeOpacity, 1)
  assert.equal(exposure[0].blur, 0)
  assert.equal(exposure[0].trailOpacity, 0)
  for (let i = 1; i < exposure.length; i++) {
    assert.ok(exposure[i].angle > exposure[i - 1].angle)
    assert.ok(exposure[i].blur > exposure[i - 1].blur)
    assert.ok(exposure[i].bladeOpacity < exposure[i - 1].bladeOpacity)
  }
})

function buffer(channels = 2, length = 7000, sampleRate = 1000) {
  const data = Array.from({ length: channels }, () => new Float32Array(length))
  return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: i => data[i] }
}
function parameter() {
  return { value: 0, targets: [], setTargetAtTime(value, time, constant) { this.targets.push({ value, time, constant }) } }
}
class Context {
  static instances = []
  static blocked = false
  constructor() {
    this.sources = []
    this.gains = []
    this.events = []
    this.state = 'suspended'
    this.currentTime = 0
    this.destination = {}
    Context.instances.push(this)
  }
  resume() {
    this.events.push('resume')
    if (Context.blocked) return Promise.reject(new Error('NotAllowedError'))
    this.state = 'running'
    return Promise.resolve()
  }
  close() { this.state = 'closed'; return Promise.resolve() }
  createBuffer(...args) { return buffer(...args) }
  decodeAudioData() { return Promise.resolve(buffer()) }
  createGain() {
    const node = { gain: parameter(), connect() {}, disconnect() {} }
    this.gains.push(node)
    return node
  }
  createBufferSource() {
    const node = {
      playbackRate: parameter(), loop: false, started: 0, stopped: 0,
      connect() {}, disconnect() {},
      start() { this.started++ },
      stop() { this.stopped++ },
    }
    this.sources.push(node)
    return node
  }
}
const originalFetch = global.fetch
const originalWindow = global.window
const originalWarn = console.warn
afterEach(() => {
  global.fetch = originalFetch
  global.window = originalWindow
  console.warn = originalWarn
  Context.instances = []
  Context.blocked = false
})
function setup({ deferred = false, base = '/' } = {}) {
  global.window = { AudioContext: Context }
  console.warn = () => {}
  const requests = []
  global.fetch = (url) => {
    const request = { url }
    requests.push(request)
    Context.instances[0].events.push('fetch')
    const response = { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }
    if (!deferred) return Promise.resolve(response)
    return new Promise(resolve => { request.resolve = (overrides = {}) => resolve({ ...response, ...overrides }) })
  }
  const errors = []
  const { FanAudio } = loadAudio(base)
  const audio = new FanAudio(message => errors.push(message))
  return { audio, requests, errors }
}

test('cold load unlocks audio during the gesture, fetches complete files, and starts one seamless loop', async () => {
  const { audio, requests, errors } = setup({ deferred: true })
  const pending = audio.selectLevel(1)
  const context = Context.instances[0]
  assert.equal(context.events[0], 'resume')
  assert.deepEqual(requests.map(r => r.url), ['/audio/switch.mp3', '/audio/fan.wav'])
  assert.equal(context.sources.length, 0)
  audio.updateSpeed(360)
  requests.forEach(r => r.resolve())
  await pending
  const loops = context.sources.filter(s => s.loop)
  assert.equal(loops.length, 1)
  assert.equal(loops[0].started, 1)
  assert.ok(loops[0].buffer.duration < 3)
  assert.ok(context.gains[0].gain.targets.at(-1).value > 0)
  assert.equal(errors.at(-1), '')
  audio.dispose()
})

test('subdirectory deployment uses the same base for both audio files', async () => {
  const { audio, requests } = setup({ base: '/electric-fan/' })
  await audio.selectLevel(1)
  assert.deepEqual(requests.map(r => r.url), ['/electric-fan/audio/switch.mp3', '/electric-fan/audio/fan.wav'])
  audio.dispose()
})

test('switching off before cold loading completes cannot start a stale fan source', async () => {
  const { audio, requests } = setup({ deferred: true })
  const on = audio.selectLevel(3)
  const off = audio.selectLevel(0)
  requests.forEach(r => r.resolve())
  await Promise.all([on, off])
  assert.equal(Context.instances[0].sources.filter(s => s.loop).length, 0)
  audio.dispose()
})

test('rapid changes reuse downloads and never layer multiple fan loops', async () => {
  const { audio, requests } = setup({ deferred: true })
  const selections = [audio.selectLevel(1), audio.selectLevel(3), audio.selectLevel(2)]
  audio.updateSpeed(1080)
  assert.equal(requests.length, 2)
  requests.forEach(r => r.resolve())
  await Promise.all(selections)
  await audio.selectLevel(3)
  assert.equal(Context.instances[0].sources.filter(s => s.loop).length, 1)
  audio.dispose()
})

test('wind volume and pitch follow coasting speed and stop when the rotor stops', async () => {
  const { audio } = setup()
  audio.updateSpeed(2160)
  await audio.selectLevel(3)
  const context = Context.instances[0]
  const fan = context.sources.find(s => s.loop)
  const gain = context.gains[0].gain
  const fullVolume = gain.targets.at(-1).value
  const fullPitch = fan.playbackRate.targets.at(-1).value
  await audio.selectLevel(0)
  audio.updateSpeed(360)
  assert.equal(fan.stopped, 0)
  assert.ok(gain.targets.at(-1).value < fullVolume)
  assert.ok(fan.playbackRate.targets.at(-1).value < fullPitch)
  audio.updateSpeed(0)
  assert.equal(fan.stopped, 1)
  audio.dispose()
})

test('a delayed off click cannot restart a rotor that has already stopped', async () => {
  const { audio } = setup()
  audio.updateSpeed(360)
  await audio.selectLevel(1)
  const off = audio.selectLevel(0)
  audio.updateSpeed(0)
  await off
  assert.equal(Context.instances[0].sources.filter(s => s.loop).length, 1)
  assert.equal(Context.instances[0].sources.find(s => s.loop).stopped, 1)
  audio.dispose()
})

test('failed downloads show an error and can be retried successfully', async () => {
  const { audio, requests, errors } = setup({ deferred: true })
  const failed = audio.selectLevel(1)
  requests[0].resolve()
  requests[1].resolve({ ok: false, status: 404 })
  await failed
  assert.match(errors.at(-1), /重试/)
  const retry = audio.selectLevel(1)
  assert.equal(requests.length, 3)
  requests[2].resolve()
  await retry
  assert.equal(errors.at(-1), '')
  assert.equal(Context.instances[0].sources.filter(s => s.loop).length, 1)
  audio.dispose()
})

test('autoplay rejection is handled and the next gesture resumes cached audio', async () => {
  const { audio, errors } = setup()
  Context.blocked = true
  await audio.selectLevel(2)
  assert.match(errors.at(-1), /重试/)
  Context.blocked = false
  await audio.selectLevel(2)
  assert.equal(errors.at(-1), '')
  assert.equal(Context.instances[0].sources.filter(s => s.loop).length, 1)
  audio.dispose()
})

test('unmounting during loading closes the context and prevents late playback', async () => {
  const { audio, requests } = setup({ deferred: true })
  const pending = audio.selectLevel(1)
  audio.dispose()
  requests.forEach(r => r.resolve())
  await pending
  assert.equal(Context.instances[0].state, 'closed')
  assert.equal(Context.instances[0].sources.length, 0)
})

test('the actual WAV recording yields finite stereo samples and a continuous loop seam', () => {
  const raw = fs.readFileSync('public/audio/fan.wav')
  let offset = 12
  let pcm, channels, rate, bits
  while (offset + 8 <= raw.length) {
    const id = raw.toString('ascii', offset, offset + 4)
    const size = raw.readUInt32LE(offset + 4)
    if (id === 'fmt ') {
      channels = raw.readUInt16LE(offset + 10)
      rate = raw.readUInt32LE(offset + 12)
      bits = raw.readUInt16LE(offset + 22)
    }
    if (id === 'data') pcm = raw.subarray(offset + 8, offset + 8 + size)
    offset += 8 + size + (size % 2)
  }
  assert.equal(bits, 16)
  const recording = buffer(channels, pcm.length / channels / 2, rate)
  for (let c = 0; c < channels; c++) {
    const values = recording.getChannelData(c)
    for (let i = 0; i < values.length; i++) values[i] = pcm.readInt16LE((i * channels + c) * 2) / 32768
  }
  const { createFanLoop } = loadAudio()
  const loop = createFanLoop(new Context(), recording)
  assert.equal(loop.numberOfChannels, 2)
  assert.ok(loop.duration > 2 && loop.duration < 3)
  for (let c = 0; c < channels; c++) {
    const samples = loop.getChannelData(c)
    assert.ok(samples.every(Number.isFinite))
    const reference = recording.getChannelData(c)
    const firstIndex = Math.floor(3.5 * rate) + Math.floor(0.12 * rate)
    const originalStep = Math.abs(reference[firstIndex] - reference[firstIndex - 1])
    assert.ok(Math.abs(samples[0] - samples.at(-1)) <= originalStep + 0.002)
  }
})

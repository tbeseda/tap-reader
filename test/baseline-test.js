import { createReadStream } from 'fs'
import { EventEmitter } from 'events'
import { join } from 'path'
import test from 'tape'
import TapReader from '../src/index.js'

const here = new URL('.', import.meta.url).pathname

test('TapReader', t => {
  t.plan(1)
  t.ok(TapReader, 'TapReader is imported')
})

test('TapReader: instantiation', t => {
  t.plan(7)

  const input = createReadStream(join(here, 'tap', 'simple.tap'), 'utf8')

  t.doesNotThrow(() => TapReader({ input, bail: true }), 'does not throw with valid options')

  const reader = TapReader({ input })
  t.ok(reader instanceof EventEmitter, 'reader is an EventEmitter')
  t.equal(typeof reader.on, 'function', 'reader#on is a function')

  t.throws(() => TapReader(), 'throws if no input is provided')
  t.throws(() => TapReader({}), 'throws if no input is provided')
  t.throws(() => TapReader({ input: 'foo' }), 'throws if input is not a stream')
  t.throws(() => TapReader({ input, bail: 'true' }), 'throws if bail is not a boolean')
})

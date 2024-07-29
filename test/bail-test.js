import { Readable } from 'node:stream'
import test from 'tape'
import TapReader from '../src/index.js'

test('TapReader: bail: "Bail out!"', (t) => {
  t.plan(4)

  const input = new Readable()
  const reader = TapReader({ input, bail: false })

  input.push(['TAP version 42', 'Bail out!', 'ok 43 never parsed'].join('\n'))
  input.push(null)

  reader.on('version', ({ version }) => {
    t.ok(version, 'parsed version')
  })

  reader.on('pass', ({ id }) => {
    t.fail(`should not have parsed pass: ${id}`)
  })

  reader.on('bail', ({ reason }) => {
    t.equal(reason, '"Bail out!"', 'parsed explicit bail')
  })

  reader.on('done', ({ ok }) => {
    t.notOk(ok, '"done" not ok')
  })

  reader.on('end', ({ ok }) => {
    t.notOk(ok, '"end" not ok')
  })
})

test('TapReader: bail: "pessimistic"', (t) => {
  t.plan(4)

  const input = new Readable()
  const reader = TapReader({ input, bail: true })

  input.push(['not ok 42 - broken', 'ok 43 never parsed'].join('\n'))
  input.push(null)

  reader.on('fail', ({ id }) => {
    t.equal(id, '42', 'parsed failure')
  })

  reader.on('pass', ({ id }) => {
    t.fail(`should not have parsed pass: ${id}`)
  })

  reader.on('bail', ({ reason }) => {
    t.equal(reason, 'pessimistic', 'pessimistic bail')
  })

  reader.on('done', ({ ok }) => {
    t.notOk(ok, '"done" not ok')
  })

  reader.on('end', ({ ok }) => {
    t.notOk(ok, '"end" not ok')
  })
})

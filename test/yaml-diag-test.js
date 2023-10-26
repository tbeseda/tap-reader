import { Readable } from 'stream'
import test from 'tape'
import TapReader from '../src/index.js'

test('TapReader: YAML diag', t => {
  t.plan(9)

  const input = new Readable()
  const reader = TapReader({ input })

  input.push([
    'TAP version 42',
    'not ok 1 no YAML diag',
    'not ok 2 empty YAML diag',
    '  ---',
    '  ...',
    'not ok 3 simple YAML diag',
    '  ---',
    "  message: 'First line invalid'",
    '  severity: fail',
    '  data:',
    "    got: 'Flirble'",
    "    expect: 'Fnible'",
    '  ...',
    'not ok 4 YAML diag with block',
    '  ---',
    '    operator: fail',
    '    message: |-',
    '      this is a message',
    '        with a block',
    '  ...',
    'ok 5 passing with YAML diag',
    '  ---',
    '    operator: pass',
    '    message: this is unlikely but supported',
    '  ...',
  ].join('\n'))
  input.push(null)

  reader.on('fail', ({ id, diag }) => {
    t.ok(id, `<${id}> is failing`)

    switch (id) {
      case '1':
        t.notOk(diag, `<${id}> has no diag`)
        break
      case '2':
        t.deepEqual(diag, {}, `<${id}> has empty diag`)
        break
      case '3':
        t.deepEqual(diag, {
          message: 'First line invalid',
          severity: 'fail',
          data: { got: 'Flirble', expect: 'Fnible' },
        }, `<${id}> has simple diag`)
        break
      case '4':
        t.deepEqual(diag, {
          operator: 'fail',
          message: 'this is a message\n  with a block',
        }, `<${id}> has block diag`)
        break
      default:
        t.fail(`<${id}> has no test!`)
        break
    }
  })

  reader.on('pass', ({ id, diag }) => {
    if (id === '5') {
      t.deepEqual(diag, {
        operator: 'pass',
        message: 'this is unlikely but supported',
      }, `<${id}> has block diag`)
    } else {
      t.fail(`<${id}> has no test!`)
    }
  })
})

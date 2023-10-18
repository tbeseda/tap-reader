import { Readable } from 'stream'
import test from 'tape'
import TapReader from '../src/index.js'

test('TapReader: summary', t => {
  t.plan(8)

  const input = new Readable()
  const reader = TapReader({ input })

  input.push([
    'TAP version 666',
    '# Some tests',
    'ok 1 test number one # TODO not implemented',
    'not ok 2 description',
    'a console.log message',
    'ok 3 - test number three',
    '# Some more tests',
    'ok 4 - test four # SKIP broken',
    'not ok 5 testing some things',
    '  ---',
    '    operator: fail',
    '    message: |-',
    '      this is a message',
    '  ...',
    '1..5'
  ].join('\n'))
  input.push(null)

  reader.on('done', ({ lines, summary, plan, tests, passing, failures, ok }) => {
    t.equal(lines.length, 15, 'lines')

    t.deepEqual(summary, {
      total: 5,
      pass: 3,
      fail: 2,
      skip: 1,
      todo: 1
    }, 'summary')

    t.deepEqual(plan, {
      line: '1..5',
      start: 1,
      end: 5,
      comment: undefined,
      todo: false
    }, 'plan')

    t.equal(Object.keys(tests).length, 5, 'tests')
    t.equal(Object.keys(passing).length, 3, 'passing')
    t.equal(Object.keys(failures).length, 2, 'failures')

    t.equal(failures['id:5'].diag.message, 'this is a message', 'failure message')

    t.notOk(ok, '"done" not ok')
  })
})

import { createReadStream } from 'fs'
import { join } from 'path'
import test from 'tape'
import TapReader from '../src/index.js'

const here = new URL('.', import.meta.url).pathname

test('TapReader: events shapes', t => {
  const input = createReadStream(join(here, 'tap', 'simple.tap'), 'utf8')
  const reader = TapReader({ input })

  t.plan(40)

  reader.on('version', ({ line, version }) => {
    t.ok(line, 'parsed line')
    t.equal(version, '14', 'version.version')
  })

  reader.on('plan', ({ line, start, end, comment, todo }) => {
    t.ok(line, 'parsed line')
    t.deepEqual([start, end], [1, 2], 'plan.start, plan.end')
    t.equal(comment, 'The plan!', 'plan.comment')
    t.notOk(todo, 'plan.todo')
  })

  reader.on('pass', ({ line, id, desc, skip, todo }) => {
    t.ok(line, 'parsed line')
    t.equal(id, '1', 'pass.id')
    t.equal(desc, 'Input file opened', 'pass.desc')
    t.equal(skip, undefined, 'pass.skip')
    t.equal(todo, 'Not written yet', 'pass.todo')
  })

  reader.on('other', ({ line }) => {
    t.equal(line, 'This is a log statement', 'other.line')
  })

  reader.on('comment', ({ line, comment, todo, skip }) => {
    t.ok(line, 'parsed line')
    t.equal(comment, "Here's a comment", 'comment.comment')
    t.equal(todo, true, 'comment.todo')
    t.equal(skip, undefined, 'comment.skip')
  })

  reader.on('fail', ({ line, id, desc, skip, todo, diag }) => {
    t.ok(line, 'parsed line')
    const expected = { message: 'First line invalid', severity: 'fail', data: { got: 'Flirble', expect: 'Fnible' } }

    t.equal(id, '2', 'fail.id')
    t.equal(desc, 'First line of the input valid', 'fail.desc')
    t.equal(skip, 'Not implemented', 'fail.skip')
    t.equal(todo, undefined, 'fail.todo')
    t.deepEqual(diag, expected, 'fail.diag')
  })

  reader.on('done', ({ lines, summary, tests, passing, failures, ok }) => {
    t.ok(Array.isArray(lines), 'done.lines: Array')
    t.equal(lines.length, 13, 'done.lines.length')

    const { /* plan, */ total, pass, fail, skip, todo } = summary
    t.equal(total, 2, 'done.summary: total')
    t.equal(pass, 1, 'done.summary: pass')
    t.equal(fail, 1, 'done.summary: fail')
    t.equal(skip, 1, 'done.summary: skip')
    t.equal(todo, 1, 'done.summary: todo')

    t.equal(typeof tests, 'object', 'done.tests: Object')
    t.equal(Object.keys(tests).length, 2, 'done.tests.length')
    t.deepEqual(tests['id:1'], {
      ok: true,
      line: 'ok 1 - Input file opened # TODO Not written yet',
      id: '1',
      desc: 'Input file opened',
      todo: 'Not written yet'
    }, 'done.tests["id:1"]')

    t.equal(typeof passing, 'object', 'done.passing: Object')
    t.equal(Object.keys(passing).length, 1, 'done.passing.length')
    t.deepEqual(passing['id:1'], {
      ok: true,
      line: 'ok 1 - Input file opened # TODO Not written yet',
      id: '1',
      desc: 'Input file opened',
      todo: 'Not written yet'
    }, 'done.passing["id:1"]')

    t.equal(typeof failures, 'object', 'done.failures: Object')
    t.equal(Object.keys(failures).length, 1, 'done.failures.length')
    t.deepEqual(failures['id:2'], {
      ok: false,
      line: 'not ok 2 - First line of the input valid # SKIP Not implemented',
      id: '2',
      desc: 'First line of the input valid',
      diag: {
        message: 'First line invalid',
        severity: 'fail',
        data: { got: 'Flirble', expect: 'Fnible' }
      },
      lines: [
        'not ok 2 - First line of the input valid # SKIP Not implemented',
        '  ---',
        "  message: 'First line invalid'",
        '  severity: fail',
        '  data:',
        "    got: 'Flirble'",
        "    expect: 'Fnible'",
        '  ...'
      ],
      skip: 'Not implemented'
    }, 'done.failures["id:1"]')

    t.notOk(ok, 'done: ok')
  })

  reader.on('end', ({ ok }) => {
    t.notOk(ok, 'end: ok')
  })

  reader.on('error', err => {
    t.fail(err)
  })
})

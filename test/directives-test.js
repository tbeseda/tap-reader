import { Readable } from 'stream'
import test from 'tape'
import TapReader from '../src/index.js'

test('TapReader: directives: TODO', t => {
  t.plan(21)

  const input = new Readable()
  const reader = TapReader({ input })

  input.push([
    'TAP version 42',
    // 'ok 1 # TODO',
    'ok 2 description # TODO',
    'ok 3 - description # TODO',
    'ok 4 - description # TODO reason',
    // 'not ok 5 # TODO',
    'not ok 6 description # TODO',
    'not ok 7 - description # TODO',
    'not ok 8 - description # TODO reason',
    '# TODO comment',
    '1..0',
  ].join('\n'))
  input.push(null)

  reader.on('pass', ({ id, desc, todo }) => {
    t.ok(todo, `TODO <${id}> is passing`)

    switch (id) {
      case '1':
        t.equal(todo, true, `TODO <${id}> todo parsed as boolean`)
        t.equal(desc, '', `TODO <${id}> parsed empty description`)
        break
      case '2':
        t.equal(todo, true, `TODO <${id}> todo parsed as boolean`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      case '3':
        t.equal(todo, true, `TODO <${id}> todo parsed as boolean`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      case '4':
        t.equal(todo, 'reason', `TODO <${id}> todo parsed as string`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      case '5':
        break
      case '6':
        t.equal(todo, true, `TODO <${id}> todo parsed as boolean`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      case '7':
        t.equal(todo, true, `TODO <${id}> todo parsed as boolean`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      case '8':
        t.equal(todo, 'reason', `TODO <${id}> todo parsed as string`)
        t.equal(desc, 'description', `TODO <${id}> parsed description`)
        break
      default:
        break
    }
  })

  reader.on('fail', () => {
    t.fail('all TODO tests should pass') // !!
  })

  reader.on('comment', ({ comment, todo }) => {
    t.ok(todo, 'comment is TODO')
    t.equal(comment, 'comment', 'parsed TODO comment')
  })

  reader.on('plan', ({ todo }) => {
    t.equal(todo, true, 'plan is TODO')
  })
})

test('TapReader: directives: SKIP', t => {
  t.plan(20)

  const input = new Readable()
  const reader = TapReader({ input })

  input.push([
    'TAP version 42',
    // 'ok 1 # SKIP',
    'ok 2 description # SKIP',
    'ok 3 - description # SKIP',
    'ok 4 - description # SKIP reason',
    // 'not ok 5 # SKIP',
    'not ok 6 description # SKIP',
    'not ok 7 - description # SKIP',
    'not ok 8 - description # SKIP reason',
    '# SKIP comment',
  ].join('\n'))
  input.push(null)

  reader.on('pass', ({ id, desc, skip }) => {
    t.ok(skip, `SKIP <${id}> is passing`)

    switch (id) {
      case '1':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, '', `SKIP <${id}> parsed empty description`)
        break
      case '2':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      case '3':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      case '4':
        t.equal(skip, 'reason', `SKIP <${id}> skip parsed as string`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      default:
        t.fail(`SKIP <${id}> should not have passed`)
        break
    }
  })

  reader.on('fail', ({ id, desc, skip }) => {
    t.ok(skip, `SKIP <${id}> is failing`)

    switch (id) {
      case '5':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, '', `SKIP <${id}> parsed empty description`)
        break
      case '6':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      case '7':
        t.equal(skip, true, `SKIP <${id}> skip parsed as boolean`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      case '8':
        t.equal(skip, 'reason', `SKIP <${id}> skip parsed as string`)
        t.equal(desc, 'description', `SKIP <${id}> parsed description`)
        break
      default:
        t.fail(`SKIP <${id}> should not have failed`)
        break
    }
  })

  reader.on('comment', ({ comment, skip }) => {
    t.ok(skip, 'comment is SKIP')
    t.equal(comment, 'comment', 'parsed SKIP comment')
  })
})

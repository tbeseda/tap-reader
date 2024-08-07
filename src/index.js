// * https://testanything.org/tap-version-14-specification.html
// TODO: pragma like +bail
// TODO: subtest (TAP 14?) "# Subtest: <name>"

import { EventEmitter } from 'node:events'
import { createInterface } from 'node:readline'
import { parse as parseYAML } from './vendor/yaml.js'

/**
 * @extends EventEmitter
 * @fires TapReaderEvents#version
 * @fires TapReaderEvents#pass
 * @fires TapReaderEvents#fail
 * @fires TapReaderEvents#plan
 * @fires TapReaderEvents#comment
 * @fires TapReaderEvents#other
 * @fires TapReaderEvents#done
 * @fires TapReaderEvents#end
 */
class TapReaderEvents extends EventEmitter {}

/**
 * @param {object} options TapReader options
 * @param {(NodeJS.ReadStream & { fd?: 0; }) | NodeJS.ReadableStream | import('fs').ReadStream} options.input input ReadStream
 * @param {boolean} [options.bail] bail on first failure
 * @returns {TapReaderEvents} TapReader events
 */
function TapReader(options) {
  const { input, bail: bailOption = false } = options
  if (!input) throw new Error('input stream required')
  if (!(typeof input === 'object' && typeof input.on === 'function'))
    throw new Error('input should be a stream')
  if (typeof bailOption !== 'boolean') throw new Error('bail should be a boolean')

  const events = new TapReaderEvents()
  const readline = createInterface({ input })
  const BAIL = bailOption
  const lines = [] // all lines
  const tests = {} // tests by id like "id:1"
  const summary = {
    total: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    todo: 0,
  }
  let bailed = false
  let plan

  let prevId
  let prevLine = ''
  let YAMLlines
  let YAMLing = false

  function parseLine(line) {
    lines.push(line)
    events.emit('line', { line })
    const prevTest = tests[prevId]

    if ((prevLine.startsWith('not ok') || prevLine.startsWith('ok')) && !/^\s{2}-{3}$/.test(line)) {
      // recent test doesn't have diag, emit it!
      if (prevTest.ok) {
        events.emit('pass', prevTest)
      } else {
        events.emit('fail', prevTest)
        if (BAIL) {
          bail({ reason: 'pessimistic' })
          return // quit parsing
        }
      }
    }

    if (YAMLing) {
      prevTest.lines.push(line)

      if (/^\s{2}\.{3}$/.test(line)) {
        // "  ..." YAML block close
        YAMLing = false

        if (YAMLlines && YAMLlines.length > 0) {
          prevTest.diag = parseYAML(YAMLlines.join('\n'))
        }

        events.emit(prevTest.ok ? 'pass' : 'fail', prevTest)
        if (BAIL) bail()
      } else {
        YAMLlines.push(line)
      }
    } else if (line.indexOf('Bail out!') >= 0) {
      // "Bail out!"
      bail({ reason: '"Bail out!"' })
    } else if (line.startsWith('TAP version ')) {
      // "TAP version"
      const version = line.split(' ').pop()
      events.emit('version', { line, version })
    } else if (line.startsWith('ok')) {
      // "ok"
      let [, id, desc, directive, reason] =
        line.match(/^ok (\d+)(?: - |\s+)(.*?)(?: # (TODO|SKIP) ?(.*))?$/) || []
      const test = { ok: true, line, lines: [line], id, desc }

      if (directive) {
        directive = directive.trim().toLowerCase()
        test[directive] = reason || true
      }

      const testId = `id:${id}`
      tests[testId] = test
      prevId = testId
    } else if (line.startsWith('not ok')) {
      // "not ok"
      let [, id, desc, directive, reason] =
        line.match(/^not ok (\d+)(?: - |\s+)(.*?)(?: # (TODO|SKIP) ?(.*))?$/) || []
      const test = { ok: false, line, id, desc, lines: [line] }

      if (directive) {
        directive = directive.trim().toLowerCase()
        test[directive] = reason || true
        // "Harnesses must not treat failing TODO test points as a test failure."
        if (directive === 'todo') test.ok = true
      }

      const testId = `id:${id}`
      tests[testId] = test
      prevId = testId
    } else if (/^\s{2}-{3}$/.test(line)) {
      // "  ---" YAML block open
      YAMLing = true
      YAMLlines = []
      prevTest.lines.push(line)
      prevTest.diag = {}
    } else if (line.startsWith('1..')) {
      // "1..N" plan
      let [, start, end, comment] = line.match(/^(\d+)\.\.(\d+)(?:\s*#\s*(.*))?$/) || []
      ;[start, end] = [start, end].map(Number)
      const todo = end === 0

      const newPlan = { line, start, end, comment, todo }

      if (plan) plan = [plan, newPlan]
      else plan = newPlan

      events.emit('plan', newPlan)
    } else if (line.startsWith('# ')) {
      // "# " comment
      let comment = line.substring(2)
      let todo
      let skip

      if (comment.startsWith('TODO ')) {
        comment = comment.substring(5)
        todo = true
      } else if (comment.startsWith('SKIP ')) {
        comment = comment.substring(5)
        skip = true
      }

      events.emit('comment', { line, comment, todo, skip })
    } else {
      // other
      events.emit('other', { line })
    }

    prevLine = line
  }

  function bail(payload) {
    // bail
    events.emit('bail', payload)
    bailed = true
    readline.close()
  }

  function close() {
    // done + end
    let ok = !bailed
    const passing = {}
    const failures = {}
    summary.total = Object.keys(tests).length

    for (const id in tests) {
      const test = tests[id]

      if (test.skip) summary.skip += 1
      if (test.todo) summary.todo += 1

      if (test.ok) {
        passing[id] = test
        summary.pass += 1
      } else {
        ok = false
        failures[id] = test
        summary.fail += 1
      }
    }

    events.emit('done', { lines, summary, plan, tests, passing, failures, ok })
    events.emit('end', { ok })
  }

  readline.on('line', parseLine)
  readline.on('close', close)

  return events
}

export default TapReader

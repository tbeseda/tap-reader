// * https://testanything.org/tap-version-14-specification.html
// TODO: pragma like +bail
// TODO: subtest (TAP 14?) "# Subtest: <name>"

import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import { parse } from './vendor/yaml.js';

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
class TapReaderEvents extends EventEmitter { }

/**
 * @param {object} options TapReader options
 * @param {(NodeJS.ReadStream & { fd?: 0; }) | import('fs').ReadStream} options.input input ReadStream
 * @param {boolean} [options.bail] bail on first failure
 * @returns {TapReaderEvents} TapReader events
 */
function TapReader(options) {
  const { input, bail: bailOption = false } = options;
  if (!input) throw new Error('input stream required');
  if (!(typeof input === 'object' && typeof input.on === 'function')) throw new Error('input should be a stream');
  if (typeof bailOption !== 'boolean') throw new Error('bail should be a boolean');

  const events = new TapReaderEvents();
  const readline = createInterface({ input });
  const BAIL = bailOption;
  const lines = []; // all lines
  const tests = {}; // tests by id like "id:1"
  const summary = {
    total: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    todo: 0,
  };
  let plan;

  let prevId;
  let prevLine = '';
  let YAMLblock
  let YAMLing = false;

  function parseLine(line) {
    lines.push(line);
    events.emit('line', { line });
    const prevTest = tests[prevId];

    if (prevLine.startsWith('not ok') && !/^\s{2}-{3}$/.test(line)) {
      // recent failure doesn't have diag, emit it
      if (prevTest.ok) {

        events.emit('pass', prevTest);
      } else {
        events.emit('fail', prevTest);
        if (BAIL) bail({ reason: 'Pessimistic failure' });
      }
    }

    if (YAMLing) {
      prevTest.lines.push(line);

      if (/^\s{2}\.{3}$/.test(line)) { // "  ..." YAML block close
        YAMLing = false;

        prevTest.diag = parse(YAMLblock.join('\n'));;

        events.emit('fail', prevTest);
        if (BAIL) bail();
      }
      else {
        YAMLblock.push(line)
      }
    } else if (line.indexOf('Bail out!') >= 0) { // "Bail out!"
      bail({ reason: '"Bail out!"' });
    } else if (line.startsWith('TAP version ')) { // "TAP version"
      const version = line.split(' ').pop();
      events.emit('version', { line, version });
    } else if (line.startsWith('ok')) { // "ok"
      let [_, id, desc, directive, reason] = line.match(/^ok (\d+)(?: - |\s+)(.*?)(?: # (TODO|SKIP) ?(.*))?$/) || [];
      const test = { ok: true, line, id, desc }

      if (directive) {
        directive = directive.trim().toLowerCase();
        test[directive] = reason || true;
      }

      const testId = `id:${id}`;
      tests[testId] = test;
      prevId = testId;
      events.emit('pass', test);
    } else if (line.startsWith('not ok')) { // "not ok"
      let [_, id, desc, directive, reason] = line.match(/^not ok (\d+)(?: - |\s+)(.*?)(?: # (TODO|SKIP) ?(.*))?$/) || [];
      const test = { ok: false, line, id, desc, diag: {}, lines: [line] }

      if (directive) {
        directive = directive.trim().toLowerCase();
        test[directive] = reason || true;
        // "Harnesses must not treat failing TODO test points as a test failure."
        if (directive === 'todo') test.ok = true;
      }

      const testId = `id:${id}`;
      tests[testId] = test;
      prevId = testId;
    } else if (/^\s{2}-{3}$/.test(line)) { // "  ---" YAML block open
      YAMLing = true;
      YAMLblock = [];
      prevTest.lines.push(line);
    } else if (line.startsWith('1..')) { // "1..N" plan
      let [_, start, end, comment] = line.match(/^(\d+)\.\.(\d+)(?:\s*#\s*(.*))?$/) || [];
      [start, end] = [start, end].map(Number);
      const todo = start && end && end < start;

      plan = { line, start, end, comment, todo }

      events.emit('plan', plan);
    } else if (line.startsWith('# ')) { // "# " comment
      let comment = line.substring(2);
      let todo;
      let skip;

      if (comment.startsWith('TODO ')) {
        comment = comment.substring(5);
        todo = true;
      } else if (comment.startsWith('SKIP ')) {
        comment = comment.substring(5);
        skip = true;
      }

      events.emit('comment', { line, comment, todo, skip });
    } else { // other
      events.emit('other', { line });
    }

    prevLine = line;
  }

  function bail(payload) { // bail
    events.emit('bail', payload);
    readline.close();
  }

  function close() { // done + end
    let ok = false;
    const passing = {};
    const failures = {};
    summary.total = Object.keys(tests).length;

    for (const id in tests) {
      const test = tests[id];

      if (test.skip) summary.skip += 1;
      if (test.todo) summary.todo += 1;

      if (test.ok) {
        passing[id] = test;
        summary.pass += 1;
      } else {
        ok = false;
        failures[id] = test;
        summary.fail += 1;
      }
    }

    events.emit('done', { lines, summary, plan, tests, passing, failures, ok });
    events.emit('end', { ok });
  }

  readline.on('line', parseLine);
  readline.on('close', close);

  return events;
}

export default TapReader;

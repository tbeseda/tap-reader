// TODO: subtest (TAP 14?)

import { createInterface } from 'readline';
import { EventEmitter } from 'events';

let events;
let readline;
const lines = [];
const passing = {};
const failures = {};
const summary = {
  // plan: null,
  badPlan: false,
  tests: 0,
  pass: 0,
  fail: 0,
  todo: 0,
  skip: 0,
}
let BAIL = false;
let recentId;
let recentFailType;
let failureOpen = false;

function TapReader({ input, bail = false }) {
  if (!input) throw new Error('input stream required');

  BAIL = bail;
  events = new EventEmitter();
  readline = createInterface({ input });

  readline.on('line', parseLine);
  readline.on('close', close);

  return events;
}

function parseLine(line) {
  lines.push(line);

  if (line.startsWith('TAP version ')) { // version
    const version = line.split(' ').pop();
    events.emit('version', { line, version });
  } else if (line.startsWith('ok ')) { // pass
    let [_, id, desc] = line.match(/^ok\s+(\d+)\s+(.*)/) || [];
    let todo = false;
    let skip = false;

    if (desc.endsWith(' # TODO')) {
      desc = desc.substring(0, desc.length - 7);
      todo = true;
      summary.todo++;
    } else if (desc.endsWith(' # SKIP')) {
      desc = desc.substring(0, desc.length - 7);
      skip = true;
      summary.skip++;
    }

    passing[`id:${id}`] = { id, desc, skip, todo };
    events.emit('pass', { line, id, desc, skip, todo });
  } else if (line.startsWith('not ok ')) { // fail
    let [_, id, desc] = line.match(/^not ok\s+(\d+)\s+(.*)/) || [];
    let todo = false;
    let skip = false;

    if (desc.endsWith(' # TODO')) {
      desc = desc.substring(0, desc.length - 7);
      todo = true;
      summary.todo++;
    } else if (desc.endsWith(' # SKIP')) {
      desc = desc.substring(0, desc.length - 7);
      skip = true;
      summary.skip++;
    } else if (desc === 'plan != count') {
      summary.badPlan = true;
    }

    recentId = id;
    failures[`id:${id}`] = { id, desc, skip, todo, lines: [line] };
  } else if (line.startsWith('  ---')) { // failure open
    failureOpen = true;
    failures[`id:${recentId}`].lines.push(line);
  } else if ((/^\s{4}(operator|expected|actual|stack):/).test(line)) {
    if (!failureOpen) throw new Error('failure diagnostic not open');

    const failure = failures[`id:${recentId}`];
    const [_, type, remainder] = line.match(/^\s+(operator|expected|actual|stack):\s+(.*)/) || [];
    const hasMore = remainder === '|-';

    if (!hasMore) {
      failure[type] = remainder;
    } else {
      recentFailType = type;
      failure[type] = [line];
    }

    failure.lines.push(line);
  } else if (/^\s{6}/.test(line)) { // failure diag
    if (!failureOpen) throw new Error('failure diagnostic not open');

    const failure = failures[`id:${recentId}`];

    failure[recentFailType].push(line);
    failure.lines.push(line);
  } else if (line.startsWith('  ...')) { // failure close
    if (!failureOpen) throw new Error('failure diagnostic not open');

    // TODO: optional bail

    const failure = failures[`id:${recentId}`];
    const { id, desc, operator, skip, todo } = failure;
    failure.lines.push(line);

    if (Array.isArray(failure.expected)) {
      const [_, ...rest] = failure.expected;
      failure.expected = rest.map(l => l.trim()).join('\n');
    }
    if (Array.isArray(failure.actual)) {
      const [_, ...rest] = failure.actual;
      failure.actual = rest.map(l => l.trim()).join('\n');
    }
    if (failure.stack) {
      const [_, ...rest] = failure.stack;
      failure.stack = rest.map(l => l.substring(6)).join('\n');
    }

    failureOpen = false;
    events.emit('fail', {
      line,
      id,
      desc,
      skip,
      todo,
      operator,
      actual: failure.actual,
      expected: failure.expected,
      stack: failure.stack
    });
  } else if (line.startsWith('1..')) { // plan
    const plan = line.split('..').map(Number);
    summary.plan = plan;
    events.emit('plan', { line, plan });
  } else if ((/^# (tests|pass|fail)/).test(line)) { // summary count
    let [_, type, count] = line.match(/^# (tests|pass|fail)\s+(\d+)/) || [];
    if (type && count) {
      count = Number(count)
      summary[type] = count;
      events.emit('count', { line, type, count });
    } else {
      // ! idk
    }
  } else if (line.startsWith('# ')) { // comment
    let comment = line.substring(2);
    let todo = false;
    let skip = false;

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
}

function close() { // done + end
  events.emit('done', { lines, summary, passing, failures });
  events.emit('end');
}

export default TapReader;

// * https://testanything.org/tap-version-14-specification.html
// TODO: handle other TAP producers
// TODO: subtest (TAP 14?) "# Subtest: <name>"
// TODO: explicit "Bail out!" in TAP output
// TODO: +bail pragma

import { createInterface } from 'readline';
import { EventEmitter } from 'events';

let events;
let readline;
const lines = [];
const passing = {};
const failures = {};
const summary = {
  plan: { bad: false },
  tests: 0,
  pass: 0,
  fail: 0,
  todo: 0,
  skip: 0,
}
let BAIL = false;
let ok = false;
let recentId;
let recentFailDiag;
let YAMLing = false;
let YAMLchomping = false;

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

  // if (YAMLing) {
  //   if (YAMLchomping) {
  //     failures[`id:${recentId}`][recentFailDiag].push(line);
  //   } else {
  //     failures[`id:${recentId}`][recentFailDiag] += line;
  //   }
  //   return;
  // }
  if (line.startsWith('TAP version ')) { // version
    const version = line.split(' ').pop();
    events.emit('version', { line, version });
  } else if (line.startsWith('ok')) { // pass
    let [_, id, desc, directive] = line.match(/^ok\s+(\d+)\s(?:\s*-\s*)?(.*?)(?:\s#\s(TODO|SKIP))?$/) || [];
    const pass = { line, id, desc }

    if (directive) {
      directive = directive.trim().toLowerCase();
      pass[directive] = true;
      summary[directive] = (summary[directive] || 0) + 1;
    }

    passing[`id:${id}`] = pass;
    events.emit('pass', pass);
  } else if (line.startsWith('not ok')) { // fail
    let [_, id, desc, directive] = line.match(/^not ok\s+(\d+)\s(?:\s*-\s*)?(.*?)(?:\s#\s(TODO|SKIP))?$/) || [];
    const fail = { line, lines: [line], id, desc }

    if (directive) {
      directive = directive.trim().toLowerCase();
      fail[directive] = true;
      summary[directive] = (summary[directive] || 0) + 1;
    }

    if (desc === 'plan != count') summary.plan.bad = true;
    recentId = id;
    recentFailDiag = null;
    ok = false;
    failures[`id:${id}`] = fail;
  } else if (/^\s{2}-{3}$/.test(line)) { // failure YAML open
    YAMLing = true;
    failures[`id:${recentId}`].lines.push(line);
  } else if ((/^\s+(operator|expected|actual|stack):.+$/).test(line)) { // failure YAML
    // ! this is too tape-specific
    // TODO: handle as YAML in `if (YAMLing)`
    if (!YAMLing) throw new Error('YAML block not open');

    const failure = failures[`id:${recentId}`];
    const [_, type, remainder] = line.match(/^\s+(operator|expected|actual|stack):\s+(.*)/) || [];
    YAMLchomping = remainder === '|-'; // YAML block chomp

    if (YAMLchomping) {
      recentFailDiag = type;
      failure[type] = [line]; // start array
    } else {
      failure[type] = remainder;
    }

    failure.lines.push(line);
  } else if (/^\s+Error: |^\s+at |^\s{6}/.test(line)) { // tape stack trace
    // TODO: handle as YAML in `if (YAMLing)`
    if (!YAMLing) throw new Error('YAML block not open');

    const failure = failures[`id:${recentId}`];

    failure[recentFailDiag].push(line);
    failure.lines.push(line);
  } else if (/^\s{2}\.{3}$/.test(line)) { // failure close
    if (!YAMLing) throw new Error('YAML block not open');

    // TODO: bail option

    const failure = failures[`id:${recentId}`];
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

    YAMLing = false;
    events.emit('fail', failure);
  } else if (line.startsWith('1..')) { // plan
    // TODO: handle "1..n # Reason"
    const plan = line.split('..').map(Number);
    // TODO: handle plan[1] === '0' -- equivalent to SKIP
    summary.plan.count = plan;
    events.emit('plan', { line, plan, bad: summary.plan.bad });
  } else if (line.startsWith('# ')) { // comment
    if ((/^# (tests|pass|fail)/).test(line)) { // tape-specific: summary count
      let [_, type, count] = line.match(/^# (tests|pass|fail)\s+(\d+)/) || [];
      if (type && count) {
        count = Number(count)
        summary[type] = count;
        events.emit('count', { line, type, count });
      }
    } else {
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
    }
  } else { // other
    events.emit('other', { line });
  }
}

function close() { // done + end
  events.emit('done', { lines, summary, passing, failures, ok });
  events.emit('end', { ok });
}

export default TapReader;

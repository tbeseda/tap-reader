// * https://testanything.org/tap-version-14-specification.html
// TODO: explicit "Bail out!" in TAP output
// TODO: pragma like +bail
// TODO: subtest (TAP 14?) "# Subtest: <name>"

import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import { parse } from './vendor/yaml.js';

let events;
let readline;
let BAIL = false;
let ok = false;
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

let recentId;
let recentLine = '';
let YAMLblock
let YAMLing = false;

function parseLine(line) {
  lines.push(line);

  if (
    recentLine.startsWith('not ok')
    && !/^\s{2}-{3}$/.test(line)
    && !YAMLing
  ) {
    // recent failure doesn't have diag, emit recent failure
    const failure = failures[`id:${recentId}`];
    events.emit('fail', failure);
  }

  if (YAMLing) {
    const failure = failures[`id:${recentId}`];
    failure.lines.push(line);

    if (/^\s{2}\.{3}$/.test(line)) { // "  ..." YAML block close
      YAMLing = false;
      // TODO: bail option

      failure.diag = parse(YAMLblock.join('\n'));;

      events.emit('fail', failure);
    }
    else {
      YAMLblock.push(line)
    }
  } else if (line.startsWith('TAP version ')) { // version
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
    ok = false;
    let [_, id, desc, directive] = line.match(/^not ok\s+(\d+)\s(?:\s*-\s*)?(.*?)(?:\s#\s(TODO|SKIP))?$/) || [];
    const failure = { id, desc, line, diag: {}, lines: [line] }

    if (directive) {
      directive = directive.trim().toLowerCase();
      failure[directive] = true;
      summary[directive] = (summary[directive] || 0) + 1;
    }

    failures[`id:${id}`] = failure;

    recentId = id;
    if (desc === 'plan != count') summary.plan.bad = true;
  } else if (/^\s{2}-{3}$/.test(line)) { // "  ---" YAML block open
    YAMLing = true;
    YAMLblock = [];
    failures[`id:${recentId}`].lines.push(line);
  } else if (line.startsWith('1..')) { // plan
    // TODO: handle "1..n # Reason"
    const plan = line.split('..').map(Number);
    // TODO: handle plan[1] === '0' -- equivalent to SKIP
    summary.plan.count = plan;
    events.emit('plan', { line, plan, bad: summary.plan.bad });
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

  recentLine = line;
}

function close() { // done + end
  events.emit('done', { lines, summary, passing, failures, ok });
  events.emit('end', { ok });
}

function TapReader({ input, bail = false }) {
  if (!input) throw new Error('input stream required');

  BAIL = bail;
  events = new EventEmitter();
  readline = createInterface({ input });

  readline.on('line', parseLine);
  readline.on('close', close);

  return events;
}

export default TapReader;

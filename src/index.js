// * https://testanything.org/tap-version-14-specification.html
// TODO: explicit "Bail out!" in TAP output
// TODO: pragma like +bail
// TODO: subtest (TAP 14?) "# Subtest: <name>"

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
let YAMLblocking = false;
let prevIndent = 0;

function parseLine(line) {
  lines.push(line);
  const indent = line.match(/^\s*/)[0].length;

  if (YAMLing) {
    const failure = failures[`id:${recentId}`];

    if (/^\s{2}\.{3}$/.test(line)) { // "  ..." failure YAML close
      // TODO: bail option

      YAMLing = false;
      YAMLblocking = false;

      failure.lines.push(line);

      // stringify YAML block scalars
      Object.keys(failure).filter(k => k !== 'lines').forEach(k => {
        if (Array.isArray(failure[k])) {
          const [_, ...rest] = failure[k];
          const baseIndent = rest[0].match(/^\s*/)[0].length;
          failure[k] = rest.map(l => l.substring(baseIndent)).join('\n');
        }
      });

      events.emit('fail', failure);
    }
    // ? maybe collect all YAML and parse on close?
    else if (YAMLblocking && indent >= prevIndent) {
      failure[recentFailDiag].push(line);
      failure.lines.push(line);
    }
    else if ((/^\s+([a-zA-Z0-9_]+):.+$/).test(line)) { // YAML key
      const [_, type, remainder] = line.match(/^\s+([a-zA-Z0-9_]+):\s+(.*)$/) || [];
      YAMLblocking = remainder.length <= 2 && ['|', '>'].indexOf(remainder.charAt(0)) >= 0;

      if (YAMLblocking) { // YAML block scalar
        recentFailDiag = type;
        failure[type] = [line]; // start new array
      } else {
        failure[type] = remainder;
      }

      failure.lines.push(line);
    }
    else {
      console.log('weird', { line, indent, prevIndent, YAMLing, YAMLblocking })
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
  } else if (/^\s{2}-{3}$/.test(line)) { // "  ---" failure YAML open
    YAMLing = true;
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

  prevIndent = indent;
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

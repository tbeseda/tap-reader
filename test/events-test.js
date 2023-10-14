import { createReadStream } from 'fs';
import { join } from 'path';
import test from 'tape';
import TapReader from '../src/index.js';

const here = new URL('.', import.meta.url).pathname;

test('TapReader: events shapes', t => {
  const input = createReadStream(join(here, 'tap', 'simple.tap'), 'utf8');
  const reader = TapReader({ input });

  t.plan(33);

  reader.on('version', ({ version }) => {
    t.equal(version, '14', 'version.version');
  });

  reader.on('plan', ({ plan, bad }) => {
    t.deepEqual(plan, [1, 2], 'plan.plan');
    t.equal(bad, false, 'plan.bad');
  });

  reader.on('pass', ({ id, desc, skip, todo, reason }) => {
    t.equal(id, '1', 'pass.id');
    t.equal(desc, 'Input file opened', 'pass.desc');
    t.equal(skip, undefined, 'pass.skip');
    t.equal(todo, true, 'pass.todo');
    t.equal(reason, 'Not written yet', 'pass.reason');
  });

  reader.on('other', ({ line }) => {
    t.equal(line, 'This is a log statement', 'other.line');
  });

  reader.on('comment', ({ comment, todo, skip }) => {
    t.equal(comment, "Here's a comment", 'comment.comment');
    t.equal(todo, true, 'comment.todo');
    t.equal(skip, undefined, 'comment.skip');
  });

  reader.on('fail', ({ id, desc, skip, todo, reason, diag }) => {
    const expected = { message: 'First line invalid', severity: 'fail', data: { got: 'Flirble', expect: 'Fnible' } }

    t.equal(id, '2', 'fail.id');
    t.equal(desc, 'First line of the input valid', 'fail.desc');
    t.equal(skip, true, 'fail.skip');
    t.equal(todo, undefined, 'fail.todo');
    t.equal(reason, 'Not implemented', 'fail.reason');
    t.deepEqual(diag, expected, 'fail.diag');
  });

  reader.on('done', ({ lines, summary, passing, failures, ok, }) => {
    t.ok(Array.isArray(lines), 'done.lines: Array')
    t.equal(lines.length, 13, 'done.lines.length');

    const { plan, tests, pass, fail, skip, todo } = summary;
    t.equal(tests, 2, 'done.summary: tests');
    t.equal(pass, 1, 'done.summary: pass');
    t.equal(fail, 1, 'done.summary: fail');
    t.equal(skip, 1, 'done.summary: skip');
    t.equal(todo, 1, 'done.summary: todo');

    t.equal(typeof passing, 'object', 'done.passing: Object');
    t.equal(Object.keys(passing).length, 1, 'done.passing.length');
    t.deepEqual(passing['id:1'], {
      line: 'ok 1 - Input file opened # TODO Not written yet',
      id: '1',
      desc: 'Input file opened',
      reason: 'Not written yet',
      todo: true
    }, 'done.passing["id:1"]');

    t.equal(typeof failures, 'object', 'done.failures: Object');
    t.equal(Object.keys(failures).length, 1, 'done.failures.length');
    t.deepEqual(failures['id:2'], {
      line: 'not ok 2 - First line of the input valid # SKIP Not implemented',
      id: '2',
      desc: 'First line of the input valid',
      reason: 'Not implemented',
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
      skip: true
    }, 'done.failures["id:1"]');

    t.equal(ok, false, 'done: ok');
  });

  reader.on('end', ({ ok }) => {
    t.equal(ok, false, 'end: ok');
  });

  reader.on('error', err => {
    t.fail(err);
  });
})

#!/usr/bin/env node
import { stdin } from 'node:process';
import TapReader from '../src/index.js'

const write = console.log
const reader = TapReader({ input: stdin });

reader.on('version', ({ version }) => {
  write('VERSION', version);
});

reader.on('pass', ({ id, desc, skip, todo }) => {
  write('PASS', id, todo ? 'TODO' : skip ? 'SKIP' : null, desc);
});

reader.on('fail', ({ id, desc, skip, todo, diag }) => {
  const { operator, expected, actual, stack } = diag;

  write('FAIL', id, todo ? 'TODO' : skip ? 'SKIP' : null, desc);
  write(`operator: ${operator}`);
  write(`expected: ${expected}`);
  write(`actual: ${actual}`);
  write(`stack: \n${stack}`);
});

reader.on('plan', ({ plan, bad }) => {
  write(`plan: ${plan[0]} → ${plan[1]} ${bad ? '(BAD)' : ''}`);
})

reader.on('comment', ({ comment, todo, skip }) => {
  write('COMMENT', todo ? 'TODO' : skip ? 'SKIP' : null, comment);
})

reader.on('other', ({ line }) => {
  if (line.trim().length > 0) write('OTHER', line);
})

reader.on('done', ({ summary, ok }) => {
  const { tests, pass, fail, skip, todo } = summary;

  write('DONE')
  write(`tests: ${tests}`)
  write(`pass: ${pass}`)
  write(`fail: ${fail}`)
  write(`skip: ${skip}`)
  write(`todo: ${todo}`)
  write(`OK ${ok}`)
})

reader.on('end', ({ ok }) => {
  process.exit(ok ? 0 : 1);
})

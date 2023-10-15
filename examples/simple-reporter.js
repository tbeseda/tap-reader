#!/usr/bin/env node
import { stdin } from 'node:process';
import TapReader from '../src/index.js'

const write = console.log
const reader = TapReader({ input: stdin });

reader.on('version', ({ version }) => {
  write('VERSION', version);
});

reader.on('pass', ({ id, desc, skip, todo }) => {
  write('PASS', id, desc, todo ? 'TODO' : skip ? 'SKIP' : '');
});

reader.on('fail', ({ id, desc, skip, todo, diag }) => {
  write('FAIL', id, desc, todo ? 'TODO' : skip ? 'SKIP' : '');

  for (const key in diag)
    write(`  ${key}: ${diag[key]}`);
});

reader.on('plan', ({ plan, bad }) => {
  write(`plan: ${plan[0]} → ${plan[1]} ${bad ? '(BAD)' : ''}`);
})

reader.on('comment', ({ comment, todo, skip }) => {
  write('COMMENT', comment, todo ? 'TODO' : skip ? 'SKIP' : '');
})

reader.on('other', ({ line }) => {
  if (line.trim().length > 0) write('OTHER', line);
})

reader.on('done', ({ summary, ok }) => {
  const { total, pass, fail, skip, todo } = summary;

  write('DONE')
  write(`total: ${total}`)
  write(`pass: ${pass}`)
  write(`fail: ${fail}`)
  write(`skip: ${skip}`)
  write(`todo: ${todo}`)
  write(`OK ${ok}`)
})

reader.on('end', ({ ok }) => {
  process.exit(ok ? 0 : 1);
})

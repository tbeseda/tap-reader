import Parser from '../src/index.js'

const reader = new Parser({/*input: process.stdin*/});

reader.bus.on('pass', (data) => {
  // Handle "pass" event as needed
  process.stdout.write(`PASS ${data.line}\n`);
});

reader.bus.on('fail', (data) => {
  // Handle "fail" event as needed
  process.stdout.write(`FAIL ${data.line}\n`);
});

import Parser from '../src/index.js'

const write = process.stdout.write.bind(process.stdout)
const reader = new Parser({/*input: process.stdin*/ });

reader.bus.on('version', ({ version }) => {
  write(`VERSION ${version}\n`);
});

reader.bus.on('pass', ({ id, desc }) => {
  write(`PASS <${id}> "${desc}"\n`);
});

reader.bus.on('fail', ({ id, desc }) => {
  write(`FAIL <${id}> "${desc}"\n`);
});

reader.bus.on('comment', ({ comment }) => {
  write(`${comment}\n`);
})

reader.bus.on('done', ({ lines, summary }) => {
  write(`SUMMARY ${JSON.stringify(summary)}\n`);
  write(`DONE. Parsed ${lines.length} lines\n`);
})

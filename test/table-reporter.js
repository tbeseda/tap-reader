import Table from 'cli-table3'
import TapReader from '../src/index.js'

const chars = {
  'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
  'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
  'left': '', 'left-mid': '',
  'mid': '', 'mid-mid': '',
  'right': '', 'right-mid': '',
  'middle': ' ',
}
const table = new Table({
  head: ['EVENT', 'ID', 'DIRECTIVE', 'VALUE'],
  chars,
});
const write = process.stdout.write.bind(process.stdout)
const reader = TapReader({ input: process.stdin });

write('\n');

setInterval(() => { write('•') }, 150);

reader.on('version', ({ version }) => {
  table.push(['VERSION', null, null, version]);
});

reader.on('pass', ({ id, desc, skip, todo }) => {
  table.push(['PASS', id, todo ? 'TODO' : skip ? 'SKIP' : null, desc]);
});

reader.on('fail', ({ id, desc, operator, actual, expected, skip, todo, stack }) => {
  table.push(['FAIL', id, todo ? 'TODO' : skip ? 'SKIP' : null, desc]);
  table.push([null, null, null, `operator: ${operator}`]);
  table.push([null, null, null, `expected: ${expected}`]);
  table.push([null, null, null, `actual: ${actual}`]);
  table.push([null, null, null, `stack: \n${stack}`]);
});

reader.on('plan', ({ plan, bad }) => {
  table.push(['PLAN', null, null, `plan: ${plan[0]} → ${plan[1]} ${bad ? '(BAD)' : ''}`]);
})

reader.on('count', ({ type, count }) => {
})

reader.on('comment', ({ comment, todo, skip }) => {
  let evcent = 'COMMENT'
  let c = comment
  const directive = todo ? 'TODO' : skip ? 'SKIP' : null;
  if ((/^(tests|pass|fail)/).test(comment)) { // tape-specific: summary count
    const [_, type, count] = comment.match(/^(tests|pass|fail)\s+(\d+)/) || [];
    if (type && count) {
      evcent = 'COUNT'
      c = `${type}: ${count}`;
    }
  }
  table.push([evcent, null, directive, c]);
})

reader.on('other', ({ line }) => {
  if (line.trim().length > 0)
    table.push(['OTHER', null, null, line]);
})

reader.on('done', ({ summary, ok }) => {
  const { skip, todo } = summary;
  table.push(
    ['DONE', null, null, `skip: ${skip}`],
    [null, null, null, `todo: ${todo}`],
    ['OK', null, null, `${ok}`],
  );
})

reader.on('end', ({ ok }) => {
  write('\n');
  write(table.toString());
  write('\n');
  process.exit(ok ? 0 : 1);
})

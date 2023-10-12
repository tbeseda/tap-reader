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
  head: ['EVENT', 'ID', 'MARK', 'VALUE'],
  chars,
});
const write = process.stdout.write.bind(process.stdout)
const reader = TapReader({ input: process.stdin });

write('\n');

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
  table.push(['COUNT', null, null, `${type}: ${count}`]);
})

reader.on('comment', ({ comment, todo, skip }) => {
  table.push(['COMMENT', null, todo ? 'TODO' : skip ? 'SKIP' : null, comment]);
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
  write(table.toString());
  write('\n');
  process.exit(ok ? 0 : 1);
})

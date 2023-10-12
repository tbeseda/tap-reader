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

reader.on('comment', ({ comment, todo, skip }) => {
  table.push(['COMMENT', null, todo ? 'TODO' : skip ? 'SKIP' : null, comment]);
})

reader.on('other', ({ line }) => {
  if (line.trim().length > 0)
    table.push(['OTHER', null, null, line]);
})

reader.on('done', ({ summary }) => {
  const { plan, badPlan, tests, pass, fail, skip, todo } = summary;
  table.push(
    ['DONE', null, null, `plan: ${plan[0]} → ${plan[1]} (${badPlan ? 'bad' : 'good'})`],
    [null, null, null, `tests: ${tests}`],
    [null, null, null, `pass: ${pass}`],
    [null, null, null, `fail: ${fail}`],
    [null, null, null, `skip: ${skip}`],
    [null, null, null, `todo: ${todo}`],
  );
  write(table.toString());
  write('\n');
})

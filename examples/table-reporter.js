#!/usr/bin/env node
import Table from 'cli-table3'
import TapReader from '../src/index.js'

const { stdin, stdout } = process
const write = stdout.write.bind(stdout)
const reader = TapReader({ input: stdin })
const chars = {
  top: '',
  'top-mid': '',
  'top-left': '',
  'top-right': '',
  bottom: '',
  'bottom-mid': '',
  'bottom-left': '',
  'bottom-right': '',
  left: '',
  'left-mid': '',
  mid: '',
  'mid-mid': '',
  right: '',
  'right-mid': '',
  middle: ' ',
}
const table = new Table({
  head: ['EVENT', 'ID', 'DIRECTIVE', 'VALUE'],
  chars,
})

write(' ')

reader.on('version', ({ version }) => {
  write('•')

  table.push(['VERSION', null, null, version])
})

reader.on('pass', ({ id, desc, skip, todo, reason }) => {
  write('•')

  let directive = todo ? 'TODO' : skip ? 'SKIP' : ''
  directive += reason ? ` (${reason})` : ''

  table.push(['PASS', id, directive, desc])
})

reader.on('fail', ({ id, desc, skip, todo, reason, diag }) => {
  write('•')

  let directive = todo ? 'TODO' : skip ? 'SKIP' : ''
  directive += reason ? ` (${reason})` : ''

  table.push(['FAIL', id, directive, desc])
  for (const key in diag) {
    table.push([null, null, null, `${key}: ${diag[key]}`])
  }
})

reader.on('plan', ({ start, end, comment, todo }) => {
  write('•')

  table.push(['PLAN', null, null, `plan: ${start} → ${end} ${comment || ''} ${todo ? 'TODO' : ''}`])
})

reader.on('comment', ({ comment, todo, skip }) => {
  if (/^(tests|pass|fail)/.test(comment)) return // tape-specific: summary count

  write('•')

  const directive = todo ? 'TODO' : skip ? 'SKIP' : null

  table.push(['COMMENT', null, directive, comment])
})

reader.on('other', ({ line }) => {
  write('•')

  if (line.trim().length > 0) {
    table.push(['OTHER', null, null, line])
  }
})

reader.on('done', ({ summary, failures, ok }) => {
  write('•')

  table.push(['DONE', null, null, null])

  for (const key in failures) {
    const { id, ok: failOk, desc } = failures[key]
    if (failOk) continue
    table.push([null, id, null, desc])
  }

  table.push([null, null, null, null])

  const { total, pass, fail, skip, todo } = summary
  table.push(
    [null, null, null, `total: ${total}`],
    [null, null, null, `pass: ${pass}`],
    [null, null, null, `fail: ${fail}`],
    [null, null, null, `skip: ${skip}`],
    [null, null, null, `todo: ${todo}`],
    [null, null, null, `OK: ${ok}`],
  )
})

reader.on('end', ({ ok }) => {
  write('\n')
  write(table.toString())
  write('\n')
  process.exit(ok ? 0 : 1)
})

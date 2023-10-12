import test from 'tape'

test('Sample passing tests', (t) => {
  t.plan(3)

  t.deepEqual([3, 4, 5], [3, 4, 2 + 3], 'A deeply equal array')
  t.skip('A skipped test')
  t.deepEqual({ a: 7, b: [8, 9] }, { a: 3 + 4, b: [8, 9] }, 'A deeply equal object')

  console.log('Arbitrary log')
})

test(
  'A test set marked as "todo"',
  { todo: true },
  (t) => {
    t.pass('A passing todo')
    t.fail('A failing todo')
    t.end()
  },
)

test('A slow test', async (t) => {
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.pass('100ms passing test')
  await new Promise((resolve) => setTimeout(resolve, 75))
  t.pass('75ms passing test')
  await new Promise((resolve) => setTimeout(resolve, 50))
  t.pass('50ms passing test')
  t.end()
})

test(
  'A test set marked as "skip"',
  { skip: true },
  async (t) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    t.pass('A slow passing test')
    await new Promise((resolve) => setTimeout(resolve, 75))
    t.pass('A slow passing test')
    await new Promise((resolve) => setTimeout(resolve, 50))
    t.pass('A slow passing test')
    t.end()
  }
)

test('Some failing tests', (t) => {
  t.plan(3)

  t.equal(7 * 8 + 10, 666)
  t.equal('Bad dog', 'Good dog')

  t.test('Nested tests', (st) => {
    st.deepEqual(
      ['foo', 'bar', 'baz'],
      ['foo', 'bar', 'foobar baz'],
      'Sub-test partial array failure'
    )
    st.deepEqual(
      { a: 'foo', b: [42], c: 'baz' },
      { a: 'bar', b: [420] },
      'A small object deepEqual failure'
    )
    st.end()
  })
})

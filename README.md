<h1 align="center"><code>tap-reader</code> 📜</h1>

<p align="center">
  A smol, streaming <a href="https://testanything.org/">TAP</a> parser. Works well with <a href="https://www.npmjs.com/package/tape/"><code>tape</code></a>.<br>
  <a href="https://www.npmjs.com/package/tap-reader"><strong><code>tap-reader</code> on npmjs.org »</strong></a><br>
  Documentation soon...
</p>

Sample reporter that leverages `tap-reader`:

```js
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

reader.on('plan', ({ plan, comment, todo }) => {
  write(`plan: ${plan[0]} → ${plan[1]} ${comment || ''} ${todo ? 'TODO' :''}`);
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
```

Also see `examples/table-reporter.js` for another example.

## Coming next:

- [ ] More TAP features like subtests, +pragmas, etc.
- [ ] Documentation for config and events
- [ ] Intellisense via `.d.ts`

## FAQ:

**Why is `yaml` vendored?**  
Because the published module is large. `tap-reader` should install and run as quickly as possible in a CI environment.  
I'm not stoked on it so this may change in the future.

**Why not use `tap-parser`?**  
`tap-parser` is great but... see above.

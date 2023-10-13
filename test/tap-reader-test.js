import { createReadStream } from 'fs';
import { join } from 'path';
import test from 'tape';
import TapReader from '../src/index.js';

const here = new URL('.', import.meta.url).pathname;

test('TapReader', t => {
  t.plan(1);
  t.ok(TapReader, 'TapReader is imported');
});

test('TapReader: reader', t => {
  t.plan(1);
  const input = createReadStream(join(here, 'tap', 'simple.tap'), 'utf8');
  const reader = TapReader({ input });
  t.ok(reader, 'reader is created');
});

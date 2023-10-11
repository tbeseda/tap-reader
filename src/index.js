import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

class TapReader extends PassThrough {
  bus;
  lines = [];
  passing = {};
  failures = {};
  summary = {}

  constructor({ input = process.stdin } = {}) {
    super();
    this.bus = new EventEmitter();

    const rl = createInterface({ input });

    rl.on('line', (line) => {
      this.lines.push(line);

      if (line.startsWith('TAP version ')) {
        const version = line.split(' ').pop();
        this.bus.emit('version', { line, version });
      } else if (line.startsWith('ok ')) {
        const [_, id, desc] = line.match(/^ok\s+(\d+)\s+(.*)/) || [];
        this.passing[`id:${id}`] = { id, desc };
        this.bus.emit('pass', { line, id, desc });
      } else if (line.startsWith('not ok ')) {
        const [_, id, desc] = line.match(/^not ok\s+(\d+)\s+(.*)/) || [];
        this.failures[`id:${id}`] = { id, desc, lines: [line] };
        this.bus.emit('fail', { line, id, desc });
      } else if (line.startsWith('1..')) {
        const plan = line.split('..').map(Number);
        this.summary.plan = plan;
        this.bus.emit('plan', { line, plan });
      } else if ((/^# (tests|pass|fail)/).test(line)) {
        const [_, type, count] = line.match(/^# (tests|pass|fail)\s+(\d+)/) || [];
        if (type && count) {
          const n = Number(count)
          this.summary[type] = n;
          this.bus.emit('count', { line, type, n });
        } else {
          // ! idk
        }
      } else if (line.startsWith('# ')) {
        const comment = line.substring(2);
        this.bus.emit('comment', { line, comment });
      } else {
        this.bus.emit('other', { line });
      }
    });

    rl.on('close', () => {
      this.bus.emit('done', { lines: this.lines, summary: this.summary, passing: this.passing, failures: this.failures });
      this.bus.emit('end');
    });
  }
}

export default TapReader;

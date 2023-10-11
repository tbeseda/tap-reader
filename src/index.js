import { createInterface } from 'readline';
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';

class TapReader extends PassThrough {
  bus;
  lines = [];

  constructor({input = process.stdin} = {}) {
    super();
    this.bus = new EventEmitter();

    const rl = createInterface({input});

    rl.on('line', (line) => {
      this.lines.push(line);

      if (line.startsWith('ok')) {
        this.bus.emit('pass', {line});
      } else if (line.startsWith('not ok')) {
        this.bus.emit('fail', {line});
      }
    });

    rl.on('close', () => {
      this.bus.emit('end');
    });
  }
}

export default TapReader;

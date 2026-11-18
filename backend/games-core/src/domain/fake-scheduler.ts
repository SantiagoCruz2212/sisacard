import type { Scheduler } from './shared.js';

/** Reloj controlable para pruebas: el tiempo solo avanza cuando se llama a advance(). */
export class FakeScheduler implements Scheduler {
  time = 0;
  private tasks: { at: number; fn: () => void; cancelled: boolean }[] = [];

  now() {
    return this.time;
  }

  after(ms: number, fn: () => void) {
    const task = { at: this.time + ms, fn, cancelled: false };
    this.tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  }

  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const next = this.tasks.filter((t) => !t.cancelled && t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      this.time = next.at;
      next.cancelled = true;
      next.fn();
    }
    this.time = target;
  }
}

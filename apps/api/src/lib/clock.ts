export interface Clock {
  nowMs(): number;
  todayIso(): string;
}

export const systemClock: Clock = {
  nowMs(): number {
    return Date.now();
  },
  todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  },
};

export class TestClock implements Clock {
  private currentMs: number;

  public constructor(initialMs: number = Date.now()) {
    this.currentMs = initialMs;
  }

  public nowMs(): number {
    return this.currentMs;
  }

  public todayIso(): string {
    return new Date(this.currentMs).toISOString().slice(0, 10);
  }

  public advanceMs(ms: number): void {
    this.currentMs += ms;
  }
}

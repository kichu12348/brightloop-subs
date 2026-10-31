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


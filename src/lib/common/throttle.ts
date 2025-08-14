type TimeoutId = ReturnType<typeof setTimeout>;

export class ThrottleTimer {
  private delay: number;
  private cb: (() => void) | null;
  private timeoutId: TimeoutId | null = null;
  private lastExecTime: number = 0;
  private leading: boolean;
  private trailing: boolean;
  private pendingCall: boolean = false;

  constructor(
    delay: number,
    options: { leading?: boolean; trailing?: boolean } = {}
  ) {
    this.delay = delay;
    this.cb = null;
    this.leading = options.leading !== false; // 默认为 true
    this.trailing = options.trailing !== false; // 默认为 true
  }

  trigger(cb: () => void): void {
    this.cb = cb;
    const now = Date.now();
    const elapsed = now - this.lastExecTime;

    // 如果是第一次调用或者已经超过延迟时间
    if (this.lastExecTime === 0 || elapsed >= this.delay) {
      if (this.leading) {
        // 立即执行（leading edge）
        this.execute();
        this.lastExecTime = now;
      } else {
        // 不立即执行，但记录时间
        this.lastExecTime = now;
        this.scheduleTrailing();
      }
    } else {
      // 还在冷却期内，安排 trailing 执行
      this.scheduleTrailing();
    }
  }

  private execute(): void {
    if (this.cb) {
      const callback = this.cb;
      this.cb = null;
      this.pendingCall = false;
      callback();
    }
  }

  private scheduleTrailing(): void {
    if (!this.trailing || this.pendingCall) {
      return;
    }

    this.pendingCall = true;
    const remaining = this.delay - (Date.now() - this.lastExecTime);

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(
      () => {
        this.timeoutId = null;
        if (this.pendingCall) {
          this.execute();
          this.lastExecTime = Date.now();
        }
      },
      Math.max(remaining, 0)
    );
  }

  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.cb = null;
    this.pendingCall = false;
  }

  flush(): void {
    if (this.pendingCall && this.cb) {
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.execute();
      this.lastExecTime = Date.now();
    }
  }

  isPending(): boolean {
    return this.timeoutId !== null || this.pendingCall;
  }

  reset(): void {
    this.cancel();
    this.lastExecTime = 0;
  }
}

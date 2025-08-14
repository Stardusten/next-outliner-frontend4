type TimeoutId = ReturnType<typeof setTimeout>;

export class DebouncedTimer {
  private delay: number;
  private maxDelay: number;
  private cb: (() => void) | null;
  private timeoutId: TimeoutId | null = null;
  private maxTimeoutId: TimeoutId | null = null;
  private lastCallTime: number = 0;

  constructor(delay: number, maxDelay: number) {
    this.delay = delay;
    this.maxDelay = maxDelay;
    this.cb = null;
  }

  trigger(cb: () => void): void {
    this.cb = cb;
    const now = Date.now();

    // 清除之前的普通定时器
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // 检查是否需要设置或重置最大延迟定时器
    if (this.maxTimeoutId === null) {
      // 第一次调用，设置最大延迟定时器
      this.lastCallTime = now;
      this.maxTimeoutId = setTimeout(() => {
        this.flush();
      }, this.maxDelay);
    } else {
      // 检查是否已经超过最大延迟时间
      const elapsed = now - this.lastCallTime;
      if (elapsed >= this.maxDelay) {
        // 已经超过最大延迟，立即执行
        this.flush();
        return;
      }
      // 还没超过最大延迟，无需重新设置maxTimeoutId
    }

    // 设置普通的防抖定时器
    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.maxTimeoutId !== null) {
      clearTimeout(this.maxTimeoutId);
      this.maxTimeoutId = null;
    }
    this.cb = null;
  }

  flush(): void {
    if (this.cb) {
      const callback = this.cb;
      this.cancel();
      callback();
    }
  }

  isPending(): boolean {
    return this.timeoutId !== null || this.maxTimeoutId !== null;
  }
}

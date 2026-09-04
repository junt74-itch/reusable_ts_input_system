const GLOW_DURATION_MS = 400;

export class EdgeGlowTracker {
  private readonly lastPressed = new Map<string, number>();
  private readonly lastReleased = new Map<string, number>();

  record(id: string, wasPressed: boolean, wasReleased: boolean, now: number): void {
    if (wasPressed) {
      this.lastPressed.set(id, now);
    }
    if (wasReleased) {
      this.lastReleased.set(id, now);
    }
  }

  pressedGlow(id: string, now: number): number {
    return this.glowStrength(this.lastPressed.get(id), now);
  }

  releasedGlow(id: string, now: number): number {
    return this.glowStrength(this.lastReleased.get(id), now);
  }

  private glowStrength(timestamp: number | undefined, now: number): number {
    if (timestamp === undefined) {
      return 0;
    }
    const elapsed = now - timestamp;
    if (elapsed >= GLOW_DURATION_MS) {
      return 0;
    }
    return 1 - elapsed / GLOW_DURATION_MS;
  }
}

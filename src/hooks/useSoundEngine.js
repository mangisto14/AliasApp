// ═══════════════════════════════════════════════════════════════════
// src/hooks/useSoundEngine.js
// Custom React Hook for game sound effects using Web Audio API.
// Includes resumeAudio() for browser autoplay policy bypass.
// ═══════════════════════════════════════════════════════════════════

import { useRef, useCallback, useEffect } from "react";

// ─── Sound Definitions ─────────────────────────────────────────────
const SOUND_DEFS = {
  correct(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(523, now);
    o.frequency.setValueAtTime(659, now + 0.08);
    o.frequency.setValueAtTime(784, now + 0.16);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    o.start(now); o.stop(now + 0.3);
  },
  skip(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(300, now);
    o.frequency.setValueAtTime(200, now + 0.1);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    o.start(now); o.stop(now + 0.2);
  },
  tick(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(800, now);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    o.start(now); o.stop(now + 0.05);
  },
  alarm(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, now);
    o.frequency.setValueAtTime(440, now + 0.15);
    o.frequency.setValueAtTime(880, now + 0.3);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    o.start(now); o.stop(now + 0.5);
  },
  bonus(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    [523, 659, 784, 1047].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.08));
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    o.start(now); o.stop(now + 0.5);
  },
  fanfare(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "square";
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => o.frequency.setValueAtTime(f, now + i * 0.12));
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    o.start(now); o.stop(now + 0.8);
  },
  poison(ctx, now) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(150, now);
    o.frequency.setValueAtTime(100, now + 0.2);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    o.start(now); o.stop(now + 0.3);
  },
};

// ─── Vibration helper ──────────────────────────────────────────────
export function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ═══════════════════════════════════════════════════════════════════
// useSoundEngine Hook
// ═══════════════════════════════════════════════════════════════════
export function useSoundEngine(enabled = true) {
  const ctxRef = useRef(null);
  const resumedRef = useRef(false);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  /**
   * resumeAudio — Call on FIRST user interaction (click/tap)
   * to unlock AudioContext and bypass browser autoplay restrictions.
   */
  const resumeAudio = useCallback(() => {
    if (resumedRef.current) return;
    try {
      const ctx = getContext();
      if (ctx.state === "suspended") ctx.resume();
      resumedRef.current = true;
    } catch { /* silent */ }
  }, [getContext]);

  // Auto-attach resume listener on mount
  useEffect(() => {
    const handler = () => resumeAudio();
    document.addEventListener("touchstart", handler, { once: true });
    document.addEventListener("click", handler, { once: true });
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("click", handler);
    };
  }, [resumeAudio]);

  const play = useCallback((soundName) => {
    if (!enabled) return;
    try {
      const ctx = getContext();
      if (ctx.state === "suspended") ctx.resume();
      const fn = SOUND_DEFS[soundName];
      if (fn) fn(ctx, ctx.currentTime);
    } catch { /* silent */ }
  }, [enabled, getContext]);

  const playCorrect = useCallback(() => play("correct"), [play]);
  const playSkip    = useCallback(() => play("skip"), [play]);
  const playTick    = useCallback(() => play("tick"), [play]);
  const playAlarm   = useCallback(() => play("alarm"), [play]);
  const playBonus   = useCallback(() => play("bonus"), [play]);
  const playFanfare = useCallback(() => play("fanfare"), [play]);
  const playPoison  = useCallback(() => play("poison"), [play]);

  return { play, resumeAudio, playCorrect, playSkip, playTick, playAlarm, playBonus, playFanfare, playPoison };
}

export default useSoundEngine;

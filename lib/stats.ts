// Statistics aggregation: recording reading sessions, computing streaks and
// deriving the numbers the Stats screen shows.

import type { DailyStat, GlobalStats } from "@/types";
import {
  getDailyStats,
  getGlobalStats,
  saveDailyStats,
  saveGlobalStats,
} from "@/lib/storage";

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export interface SessionDelta {
  wordsRead: number;
  timeReadMs: number;
  speed: number; // wpm active during the session
  finishedBook?: boolean;
}

/** Persist a chunk of reading activity into both global and daily stats. */
export async function recordSession(delta: SessionDelta): Promise<void> {
  if (delta.wordsRead <= 0 && delta.timeReadMs <= 0) return;

  const [global, daily] = await Promise.all([
    getGlobalStats(),
    getDailyStats(),
  ]);

  const nextGlobal: GlobalStats = {
    totalTimeMs: global.totalTimeMs + delta.timeReadMs,
    totalWordsRead: global.totalWordsRead + delta.wordsRead,
    maxSpeed: Math.max(global.maxSpeed, delta.speed),
    booksFinished: global.booksFinished + (delta.finishedBook ? 1 : 0),
    speedSampleSum: global.speedSampleSum + delta.speed * delta.wordsRead,
    speedSampleCount: global.speedSampleCount + delta.wordsRead,
  };

  const key = todayKey();
  const day = daily.find((d) => d.date === key);
  if (day) {
    day.wordsRead += delta.wordsRead;
    day.timeReadMs += delta.timeReadMs;
    day.maxSpeed = Math.max(day.maxSpeed, delta.speed);
  } else {
    daily.push({
      date: key,
      wordsRead: delta.wordsRead,
      timeReadMs: delta.timeReadMs,
      maxSpeed: delta.speed,
    });
  }

  await Promise.all([saveGlobalStats(nextGlobal), saveDailyStats(daily)]);
}

/** Consecutive days ending today (or yesterday) with any reading activity. */
export function computeStreak(daily: DailyStat[]): number {
  if (daily.length === 0) return 0;
  const days = new Set(daily.filter((d) => d.wordsRead > 0).map((d) => d.date));
  let streak = 0;
  const cursor = new Date();

  // Allow the streak to still count if the user hasn't read *today* yet.
  if (!days.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(todayKey(cursor))) return 0;
  }

  while (days.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function averageSpeed(global: GlobalStats): number {
  if (global.speedSampleCount === 0) return 0;
  return Math.round(global.speedSampleSum / global.speedSampleCount);
}

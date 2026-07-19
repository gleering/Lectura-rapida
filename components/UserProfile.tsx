"use client";

import { useEffect, useState } from "react";
import { Crown, Zap, Trophy, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  calculateLevel,
  BADGES,
  checkBadges,
  type BadgeType,
  type UserLevel,
} from "@/lib/achievements";
import { getGlobalStats, getDailyStats } from "@/lib/storage";
import type { GlobalStats, DailyStat } from "@/types";

export function UserProfile() {
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<BadgeType>>(
    new Set()
  );
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  useEffect(() => {
    Promise.all([getGlobalStats(), getDailyStats()]).then(([g, d]) => {
      setStats(g);
      setDailyStats(d);

      // Calcular nivel
      const xpFromWords = g.totalWordsRead; // 1 XP por palabra
      const xpFromBooks = g.booksFinished * 200;
      const totalXP = xpFromWords + xpFromBooks;
      setLevel(calculateLevel(totalXP));

      // Calcular badges
      const avgAccuracy =
        g.speedSampleCount > 0 ? g.speedSampleSum / g.speedSampleCount / 100 : 0;
      const consecutiveDays = calculateConsecutiveDays(d);

      const badgeList = checkBadges({
        totalWordsRead: g.totalWordsRead,
        avgAccuracy,
        consecutiveDays,
        schulteMaxLevel: 1, // TODO: obtener del storage
        nbackMaxLevel: 1, // TODO: obtener del storage
        perfectTests: 0, // TODO: obtener del storage
        maxSpeed: g.maxSpeed,
        exerciseSessions: 0, // TODO: obtener del storage
      });

      setBadges(badgeList);
      setUnlockedBadges(new Set(badgeList));
    });
  }, []);

  if (!level || !stats) {
    return (
      <div className="text-sm text-muted-foreground">
        Cargando perfil...
      </div>
    );
  }

  const progressToNextLevel = level.requiredXP;
  const progressFromCurrentLevel = calculateLevel(
    level.experience - 1
  ).requiredXP;
  const progressPercent =
    ((progressFromCurrentLevel - progressToNextLevel) /
      progressFromCurrentLevel) *
    100;

  return (
    <div className="space-y-6">
      {/* Perfil Principal */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="size-5 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">Nivel</p>
                </div>
                <p className="text-4xl font-bold">{level.level}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {level.title}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>XP</span>
                  <span className="font-medium">
                    {level.experience.toLocaleString()}/
                    {(level.experience + level.requiredXP).toLocaleString()}
                  </span>
                </div>
                <Progress value={progressPercent} />
                <p className="text-xs text-muted-foreground">
                  {level.requiredXP} XP para siguiente nivel
                </p>
              </div>
            </div>

            <div className="text-right space-y-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {badges.length}
                </div>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {stats.booksFinished}
                </div>
                <p className="text-xs text-muted-foreground">Libros leídos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Rápidas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Palabras leídas</div>
            <p className="text-2xl font-bold mt-2">
              {(stats.totalWordsRead / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Velocidad máxima</div>
            <p className="text-2xl font-bold mt-2">{stats.maxSpeed} WPM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-sm text-muted-foreground">Tiempo total</div>
            <p className="text-2xl font-bold mt-2">
              {Math.round(stats.totalTimeMs / 1000 / 60)}m
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Badges Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" />
            Logros y Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Object.entries(BADGES).map(([badgeId, badge]) => {
              const isUnlocked = unlockedBadges.has(badgeId as BadgeType);
              return (
                <div
                  key={badgeId}
                  className={`p-3 rounded-lg text-center transition-all ${
                    isUnlocked
                      ? "bg-yellow-500/10 border-2 border-yellow-500"
                      : "bg-secondary/30 border-2 border-border opacity-50"
                  }`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="text-xs font-medium leading-tight">
                    {badge.name}
                  </p>
                  {!isUnlocked && (
                    <Lock className="size-3 mx-auto mt-2 opacity-50" />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {badge.description}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Próximos Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desbloques Próximos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(BADGES)
            .filter(([id]) => !unlockedBadges.has(id as BadgeType))
            .slice(0, 3)
            .map(([badgeId, badge]) => (
              <div key={badgeId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{badge.name}</span>
                  <Zap className="size-4 text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Calcula días consecutivos de lectura
 */
function calculateConsecutiveDays(dailyStats: DailyStat[]): number {
  if (dailyStats.length === 0) return 0;

  const today = new Date();
  let consecutiveDays = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const statForDate = dailyStats.find((s) => s.date === dateStr);

    if (statForDate && statForDate.wordsRead > 0) {
      consecutiveDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return consecutiveDays;
}

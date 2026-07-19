/**
 * Certificate Manager
 * Integración entre achievements y generación de certificados
 */

import type { UserLevel } from "./achievements";
import type { CertificateData } from "./certificate-generator";
import {
  generateLevelCertificate,
  generateProgressCertificate,
  generateAchievementCertificate,
  generateAnnualSummaryPDF,
} from "./certificate-generator";

export interface AchievementHistory {
  userId?: string;
  levelUpDates: { level: UserLevel; date: string }[];
  achievementDates: { badge: string; date: string }[];
  lastCertificateCheck: number;
}

/**
 * Genera certificados basados en logros del usuario
 */
export function generateCertificatesFromStats(
  userName: string,
  currentStats: any,
  previousStats?: any,
  achievementHistory?: AchievementHistory
): CertificateData[] {
  const certificates: CertificateData[] = [];

  // Certificado de nivel
  if (currentStats.level && currentStats.level > 1) {
    certificates.push(
      generateLevelCertificate(
        userName,
        currentStats.level,
        currentStats.totalXP || 0
      )
    );
  }

  // Certificado de progreso (si hay datos previos)
  if (previousStats) {
    const speedImprovement = Math.round(
      ((currentStats.maxSpeed || 0) - (previousStats.maxSpeed || 0)) /
        (previousStats.maxSpeed || 1) *
        100
    );
    const comprehensionImprovement =
      (currentStats.avgAccuracy || 0) - (previousStats.avgAccuracy || 0);

    if (speedImprovement > 0 || comprehensionImprovement > 0) {
      const now = new Date();
      const then = new Date(previousStats.createdAt || 0);
      const daysElapsed = Math.ceil(
        (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
      );

      certificates.push(
        generateProgressCertificate(userName, {
          speedIncrease: Math.max(0, speedImprovement),
          comprehensionIncrease: Math.max(0, comprehensionImprovement * 100),
          daysElapsed: Math.max(1, daysElapsed),
        })
      );
    }
  }

  // Certificados por logros específicos
  const badgesToCertify = [
    "speed-reader",
    "accuracy-master",
    "consistency",
    "schulte-master",
    "nback-prodigy",
  ];

  badgesToCertify.forEach((badge) => {
    if (currentStats.badges?.includes(badge)) {
      certificates.push(generateAchievementCertificate(userName, badge));
    }
  });

  // Certificado anual
  if (currentStats.totalWordsRead && currentStats.totalWordsRead > 10000) {
    certificates.push(generateAnnualSummaryPDF(userName, currentStats as any));
  }

  return certificates;
}

/**
 * Detecta nuevos certificados disponibles
 */
export function getNewCertificates(
  currentStats: any,
  lastCertificateCheck: number
): CertificateData[] {
  const now = Date.now();

  // Certificados generados en el último día
  if (now - lastCertificateCheck < 24 * 60 * 60 * 1000) {
    return generateCertificatesFromStats(
      currentStats.userName || "Usuario",
      currentStats
    );
  }

  return [];
}

/**
 * Guarda histórico de certificados
 */
export function saveCertificateHistory(
  history: AchievementHistory,
  certificate: CertificateData
): AchievementHistory {
  const updated = { ...history };

  if (certificate.certificateType === "level" && certificate.level) {
    updated.levelUpDates = [
      ...updated.levelUpDates,
      {
        level: certificate.level,
        date: certificate.date,
      },
    ];
  }

  if (certificate.certificateType === "achievement") {
    const achievement = certificate.stats[0]?.value as string;
    if (achievement) {
      updated.achievementDates = [
        ...updated.achievementDates,
        {
          badge: achievement,
          date: certificate.date,
        },
      ];
    }
  }

  updated.lastCertificateCheck = Date.now();

  return updated;
}

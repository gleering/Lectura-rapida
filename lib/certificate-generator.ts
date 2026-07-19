/**
 * Generador de Certificados Personalizados
 * Crea PDFs descargables de logros y progreso
 */

import type { UserLevel } from "./achievements";
import type { GlobalStats } from "@/types";

export interface CertificateData {
  userName: string;
  certificateType: "achievement" | "progress" | "level" | "milestone";
  title: string;
  description: string;
  date: string;
  stats: {
    metric: string;
    value: string | number;
  }[];
  level?: UserLevel;
  achievements?: string[];
}

/**
 * Genera HTML para certificado (puede convertirse a PDF con bibliotecas como html2pdf)
 */
export function generateCertificateHTML(data: CertificateData): string {
  const borderColor =
    data.certificateType === "level"
      ? "#FFD700"
      : data.certificateType === "achievement"
        ? "#10B981"
        : "#3B82F6";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Georgia', serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .certificate {
          width: 8.5in;
          height: 11in;
          background: white;
          border: 3px solid ${borderColor};
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        }
        .certificate::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent, ${borderColor}, transparent);
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid ${borderColor};
          padding-bottom: 20px;
        }
        .logo {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        .certificate-title {
          font-size: 48px;
          color: ${borderColor};
          font-weight: bold;
          margin: 20px 0;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .content {
          text-align: center;
          margin: 40px 0;
        }
        .name {
          font-size: 32px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
          text-decoration: underline;
        }
        .description {
          font-size: 16px;
          color: #666;
          margin: 20px 0;
          line-height: 1.6;
        }
        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: ${borderColor};
        }
        .footer {
          position: absolute;
          bottom: 40px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .signature {
          text-align: center;
          width: 150px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 10px;
          padding-top: 5px;
        }
        .date-issued {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <div class="logo">ReadFlow AI</div>
          <div class="certificate-title">${data.title}</div>
        </div>

        <div class="content">
          <p>Este certificado se otorga a</p>
          <div class="name">${data.userName}</div>

          <div class="description">
            ${data.description}
          </div>

          ${
            data.stats.length > 0
              ? `
            <div class="stats">
              ${data.stats
                .map(
                  (stat) =>
                    `
                <div class="stat-item">
                  <div class="stat-label">${stat.metric}</div>
                  <div class="stat-value">${stat.value}</div>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
        </div>

        <div class="footer">
          <div class="signature">
            <div class="signature-line">ReadFlow AI</div>
          </div>
          <div class="date-issued">
            ${data.date}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Genera datos para certificado de nivel
 */
export function generateLevelCertificate(
  userName: string,
  level: UserLevel,
  totalXP: number
): CertificateData {
  const titles: Record<number, string> = {
    1: "Aprendiz de Lectura Rápida",
    7: "Lector Competente",
    14: "Lector Avanzado",
    21: "Lector Experto",
    28: "Maestro de Lectura",
    35: "Leyenda de Lectura",
    42: "Pico de Perfección",
    50: "Maestro Absoluto",
  };

  const title =
    titles[level.level] || `Nivel ${level.level} - ${level.title}`;

  return {
    userName,
    certificateType: "level",
    title,
    description: `Certifico que ${userName} ha alcanzado el Nivel ${level.level} (${level.title}) en el programa ReadFlow AI, demostrando dominio en velocidad de lectura, comprensión y técnicas de entrenamiento visual.`,
    date: new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    stats: [
      { metric: "Nivel Alcanzado", value: level.level },
      { metric: "Experiencia Acumulada", value: `${totalXP.toLocaleString()} XP` },
      { metric: "Título", value: level.title },
    ],
    level,
  };
}

/**
 * Genera certificado de progreso (antes/después)
 */
export function generateProgressCertificate(
  userName: string,
  improvements: {
    speedIncrease: number;
    comprehensionIncrease: number;
    daysElapsed: number;
  }
): CertificateData {
  return {
    userName,
    certificateType: "progress",
    title: "Certificado de Progreso",
    description: `Certifico que ${userName} ha completado un programa de entrenamiento de lectura rápida de ${improvements.daysElapsed} días, logrando un aumento del ${improvements.speedIncrease}% en velocidad de lectura y una mejora del ${improvements.comprehensionIncrease}% en comprensión.`,
    date: new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    stats: [
      { metric: "Aumento de Velocidad", value: `+${improvements.speedIncrease}%` },
      { metric: "Mejora en Comprensión", value: `+${improvements.comprehensionIncrease}%` },
      { metric: "Duración del Programa", value: `${improvements.daysElapsed} días` },
    ],
  };
}

/**
 * Genera certificado de logro específico
 */
export function generateAchievementCertificate(
  userName: string,
  achievement: string
): CertificateData {
  const achievementData: Record<string, { title: string; desc: string }> = {
    "speed-reader": {
      title: "Certificado: Lector Rápido",
      desc: "por haber leído y completado más de 1000 palabras en una sola sesión",
    },
    "accuracy-master": {
      title: "Certificado: Maestro de Precisión",
      desc: "por haber alcanzado un promedio de comprensión del 80% o superior",
    },
    consistency: {
      title: "Certificado: Consistencia",
      desc: "por haber completado 7 días consecutivos de entrenamiento sin interrupciones",
    },
    "schulte-master": {
      title: "Certificado: Maestro de Schulte",
      desc: "por haber alcanzado el nivel máximo en el ejercicio de Tabla de Schulte",
    },
    "nback-prodigy": {
      title: "Certificado: Prodigio N-Back",
      desc: "por haber alcanzado 80% de precisión en el N-Back Test nivel 3",
    },
  };

  const data = achievementData[achievement] || {
    title: "Certificado de Logro",
    desc: `por completar el desafío: ${achievement}`,
  };

  return {
    userName,
    certificateType: "achievement",
    title: data.title,
    description: `Certifico que ${userName} ha demostrado excelencia en lectura rápida y entrenamiento cognitivo ${data.desc}.`,
    date: new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    stats: [{ metric: "Logro Desbloqueado", value: achievement }],
  };
}

/**
 * Genera certificado resumen anual
 */
export function generateAnnualSummaryPDF(
  userName: string,
  stats: GlobalStats
): CertificateData {
  return {
    userName,
    certificateType: "milestone",
    title: "Resumen Anual de Lectura",
    description: `Este certificado resume el dedicación y progreso de ${userName} durante su participación en el programa ReadFlow AI.`,
    date: new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    stats: [
      { metric: "Palabras Leídas", value: `${(stats.totalWordsRead / 1000).toFixed(1)}K` },
      { metric: "Libros Completados", value: stats.booksFinished },
      { metric: "Velocidad Máxima", value: `${stats.maxSpeed} WPM` },
      {
        metric: "Tiempo Total",
        value: `${Math.round(stats.totalTimeMs / 1000 / 3600)}h`,
      },
    ],
  };
}

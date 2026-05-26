// Cálculos de análisis histórico por potrero.

import type { Pastoreo, Intensity, ISODate } from '../types/models';

// Consumo de materia seca estándar: % del peso vivo por día.
// Valor por defecto si no se entrega uno explícito.
export const DEFAULT_DM_PERCENT_BW = 0.03; // 3% peso vivo / día

export interface AnnualWindow {
  /** Fecha inclusiva de inicio (yyyy-mm-dd) */
  from: ISODate;
  /** Fecha inclusiva de fin (yyyy-mm-dd) */
  to: ISODate;
  /** Año calendario o etiqueta de temporada agrícola */
  label: string;
}

/**
 * Devuelve la ventana del año calendario que contiene `today`.
 */
export function calendarYearWindow(today = new Date()): AnnualWindow {
  const y = today.getFullYear();
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`,
    label: `${y}`,
  };
}

/**
 * Devuelve la temporada agrícola que contiene `today`, comenzando en `startMonth` (1-12).
 * Por ejemplo, startMonth=7 → temporada 2025-2026 va de 2025-07-01 a 2026-06-30.
 */
export function agriculturalYearWindow(
  startMonth: number,
  today = new Date(),
): AnnualWindow {
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  const startY = m >= startMonth ? y : y - 1;
  const from = `${startY}-${String(startMonth).padStart(2, '0')}-01`;
  const endY = startY + 1;
  const endMonth = startMonth - 1 === 0 ? 12 : startMonth - 1;
  const endYY = startMonth === 1 ? startY : endY;
  const lastDay = new Date(endYY, endMonth, 0).getDate();
  const to = `${endYY}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return {
    from,
    to,
    label: `${startY}-${endY}`,
  };
}

export function previousWindow(w: AnnualWindow): AnnualWindow {
  // Recorre toda la ventana hacia atrás (mismo largo).
  const fromD = new Date(w.from);
  const toD = new Date(w.to);
  const diffDays = Math.round((toD.getTime() - fromD.getTime()) / 86400_000);
  const prevToD = new Date(fromD);
  prevToD.setDate(prevToD.getDate() - 1);
  const prevFromD = new Date(prevToD);
  prevFromD.setDate(prevFromD.getDate() - diffDays);
  return {
    from: prevFromD.toISOString().slice(0, 10),
    to: prevToD.toISOString().slice(0, 10),
    label: `${prevFromD.getFullYear()}`,
  };
}

export interface PaddockSeasonSummary {
  window: AnnualWindow;
  /** Unidades animal · día (suma de cabezas × días) */
  animal_days: number;
  /** Estimación de MS consumida en kg, usando peso medio y % MS/peso vivo */
  dm_kg_estimate: number | null;
  /** Secuencia de intensidades en orden cronológico */
  intensity_sequence: Intensity[];
  pastoreo_count: number;
}

export function summarizePaddockSeason(
  pastoreos: Pastoreo[],
  window: AnnualWindow,
  dmPercentBW = DEFAULT_DM_PERCENT_BW,
): PaddockSeasonSummary {
  const inWindow = pastoreos.filter(
    (p) => p.entry_date >= window.from && p.entry_date <= window.to,
  );
  // Orden cronológico para secuencia.
  inWindow.sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  let animal_days = 0;
  let dm_kg = 0;
  let anyWeight = false;
  const seq: Intensity[] = [];

  for (const p of inWindow) {
    const days =
      p.days_in_paddock ??
      (p.exit_date
        ? Math.max(
            1,
            Math.round(
              (new Date(p.exit_date).getTime() - new Date(p.entry_date).getTime()) /
                86400_000,
            ),
          )
        : 1);
    const ad = p.animal_count * days;
    animal_days += ad;
    if (p.weight_kg_avg) {
      dm_kg += ad * p.weight_kg_avg * dmPercentBW;
      anyWeight = true;
    }
    if (p.intensity) seq.push(p.intensity);
  }

  return {
    window,
    animal_days,
    dm_kg_estimate: anyWeight ? Math.round(dm_kg) : null,
    intensity_sequence: seq,
    pastoreo_count: inWindow.length,
  };
}

export interface SeasonComparison {
  current: PaddockSeasonSummary;
  previous: PaddockSeasonSummary;
  /** Cambio % en raciones animales vs temporada anterior (null si previa = 0) */
  animal_days_change_pct: number | null;
  /** Clasificación cualitativa */
  productivity_trend: 'mas_productivo' | 'similar' | 'menos_productivo' | 'sin_datos';
}

export function comparePaddockSeasons(
  pastoreos: Pastoreo[],
  currentWindow: AnnualWindow,
  dmPercentBW = DEFAULT_DM_PERCENT_BW,
): SeasonComparison {
  const current = summarizePaddockSeason(pastoreos, currentWindow, dmPercentBW);
  const previous = summarizePaddockSeason(
    pastoreos,
    previousWindow(currentWindow),
    dmPercentBW,
  );
  let change: number | null = null;
  let trend: SeasonComparison['productivity_trend'] = 'sin_datos';
  if (previous.animal_days > 0) {
    change = ((current.animal_days - previous.animal_days) / previous.animal_days) * 100;
    trend =
      change > 10 ? 'mas_productivo' : change < -10 ? 'menos_productivo' : 'similar';
  } else if (current.animal_days > 0) {
    trend = 'mas_productivo';
  }
  return {
    current,
    previous,
    animal_days_change_pct: change,
    productivity_trend: trend,
  };
}

/**
 * Días de rezago desde el último pastoreo registrado hasta hoy.
 */
export function daysSinceLastGrazing(
  last: Pastoreo | null,
  today = new Date(),
): number | null {
  if (!last) return null;
  const ref = last.exit_date ?? last.entry_date;
  const diff = Math.floor((today.getTime() - new Date(ref).getTime()) / 86400_000);
  return Math.max(0, diff);
}

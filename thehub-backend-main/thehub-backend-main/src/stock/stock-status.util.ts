export enum StockStatus {
  VERT = 'vert',
  ORANGE = 'orange',
  ROUGE = 'rouge',
  NON_CONFIGURE = 'non_configure', // stock cible = 0, impossible de calculer un %
}

export const DEFAULT_GREEN_THRESHOLD_PCT = 30;
export const DEFAULT_ORANGE_THRESHOLD_PCT = 15;

export interface StockThresholds {
  greenThresholdPct: number;
  orangeThresholdPct: number;
}

// Fallback : seuil article → seuil catégorie → défaut global 30/15 — §5.2
export function resolveThresholds(
  itemGreen: number | null | undefined,
  itemOrange: number | null | undefined,
  categoryGreen: number | null | undefined,
  categoryOrange: number | null | undefined,
): StockThresholds {
  return {
    greenThresholdPct: itemGreen ?? categoryGreen ?? DEFAULT_GREEN_THRESHOLD_PCT,
    orangeThresholdPct: itemOrange ?? categoryOrange ?? DEFAULT_ORANGE_THRESHOLD_PCT,
  };
}

// §5.1 : Vert >30% / Orange 15-30% / Rouge <15% du stock cible
export function computeStockStatus(
  currentStock: number,
  targetStock: number,
  thresholds: StockThresholds,
): { status: StockStatus; percentage: number | null } {
  if (targetStock <= 0) {
    return { status: StockStatus.NON_CONFIGURE, percentage: null };
  }

  const percentage = Math.round((currentStock / targetStock) * 1000) / 10; // 1 décimale

  if (percentage < thresholds.orangeThresholdPct) {
    return { status: StockStatus.ROUGE, percentage };
  }
  if (percentage < thresholds.greenThresholdPct) {
    return { status: StockStatus.ORANGE, percentage };
  }
  return { status: StockStatus.VERT, percentage };
}

// Bloc agrégé page d'accueil (§5.1) — rouge si AU MOINS un article rouge, toutes enseignes confondues
export function computeGlobalStockStatus(statuses: StockStatus[]): StockStatus {
  if (statuses.includes(StockStatus.ROUGE)) return StockStatus.ROUGE;
  if (statuses.includes(StockStatus.ORANGE)) return StockStatus.ORANGE;
  return StockStatus.VERT;
}
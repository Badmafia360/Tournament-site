// Free Fire style placement points (common tournament ruleset).
const PLACEMENT_POINTS = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export function placementPoints(placement) {
  if (!Number.isFinite(placement) || placement < 1) return 0;
  return PLACEMENT_POINTS[placement - 1] || 0;
}

export function resultPoints(placement, kills) {
  return placementPoints(placement) + Math.max(0, Number(kills) || 0);
}

export { PLACEMENT_POINTS };

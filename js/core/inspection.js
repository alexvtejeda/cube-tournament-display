// 15-second inspection (UI spec §5.1, §5.4). The limits are competition rules, not event config.
export const INSPECTION_MS = 15000;
export const INSPECTION_DNF_MS = 17000;

// What the countdown reads after `elapsedMs`: 15 down to 1 (never 0), then +2, then DNF.
export function inspectionDisplay(elapsedMs) {
  if (elapsedMs <= INSPECTION_MS) return String(Math.max(1, Math.ceil((INSPECTION_MS - elapsedMs) / 1000)));
  if (elapsedMs <= INSPECTION_DNF_MS) return '+2';
  return 'DNF';
}

// The penalty PENDING suggests for a solve started after `inspectionMs`. Same limits as the
// display, so the countdown reads +2 exactly when a start would earn one. Never applied here.
export function suggestedPenalty(inspectionMs) {
  if (inspectionMs === null || inspectionMs <= INSPECTION_MS) return null;
  return inspectionMs <= INSPECTION_DNF_MS ? '+2' : 'DNF';
}

// The mat's header byte as the audience sees it. One hand down reads as 'up'.
export function handsFromHeader(signalHeader) {
  if (signalHeader === 'C') return 'down';
  if (signalHeader === 'A') return 'ready';
  return 'up';
}

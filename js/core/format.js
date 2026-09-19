// Time display (system design §6): `12.47` under a minute, `2:14.30` over. Truncates to
// hundredths, as the StackMat's own display does.
export function formatMs(ms) {
  const hundredths = Math.floor(ms / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const fraction = String(hundredths % 100).padStart(2, '0');
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}` : `${seconds}.${fraction}`;
}

// RUNNING's status line, LÍMITE 5:00 (UI spec §6.4): M:SS. The cutoff is set in whole seconds, so
// there are no hundredths; a remainder is truncated, as formatMs does.
export function formatCutoff(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

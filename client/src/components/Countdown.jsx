import { useNow } from '../hooks/useNow.js';
import { countdownParts, formatCountdown } from '../lib/format.js';

export function Countdown({ target, prefix = '', className = '', compact = false }) {
  useNow(1000);
  const parts = countdownParts(target);
  return (
    <span className={className}>
      {prefix}
      {formatCountdown(parts, { compact })}
    </span>
  );
}

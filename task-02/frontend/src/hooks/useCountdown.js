import { useEffect, useState } from 'react';

export function useCountdown(expiresAt) {
  const [remainingMs, setRemainingMs] = useState(() => timeLeft(expiresAt));

  useEffect(() => {
    setRemainingMs(timeLeft(expiresAt));
    const timer = setInterval(() => {
      setRemainingMs(timeLeft(expiresAt));
    }, 250);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const expired = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    expired,
    remainingMs,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}

function timeLeft(expiresAt) {
  if (!expiresAt) return 0;
  return new Date(expiresAt).getTime() - Date.now();
}

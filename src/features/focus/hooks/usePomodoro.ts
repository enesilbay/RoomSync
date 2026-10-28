import { useEffect, useRef, useState } from 'react';

// Pomodoro sayacı: yalnızca telefon masadayken (isAtDesk) geri sayar.
// Not: Oynat butonu ve süre modalı focusRequested'ı ayarlamıyor; bu bilinen hata Faz 1'de düzeltilecek.
export function usePomodoro(isAtDesk: boolean) {
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroSec, setPomodoroSec] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [focusRequested, setFocusRequested] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const pomTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (pomodoroRunning && isAtDesk) {
      pomTimerRef.current = setInterval(() => {
        setPomodoroSec((prev) => (
          prev <= 1
            ? (clearInterval(pomTimerRef.current), setPomodoroRunning(false), setFocusRequested(false), 0)
            : prev - 1
        ));
      }, 1000);
    } else {
      clearInterval(pomTimerRef.current);
    }
    return () => clearInterval(pomTimerRef.current);
  }, [pomodoroRunning, isAtDesk]);

  const startPomodoro = (minutes: number) => {
    setPomodoroMinutes(minutes); setPomodoroSec(minutes * 60);
    setPomodoroRunning(true); setShowPomodoroModal(false);
  };

  const startFocusSession = () => {
    if (pomodoroSec === 0) {
      setPomodoroSec(pomodoroMinutes * 60);
    }
    setFocusRequested(true);
    setPomodoroRunning(true);
  };

  const togglePomodoro = () => {
    if (pomodoroSec === 0) {
      startPomodoro(pomodoroMinutes);
      return;
    }

    const nextRunning = !pomodoroRunning;
    setPomodoroRunning(nextRunning);
    if (!nextRunning) {
      setFocusRequested(false);
    }
  };

  return {
    pomodoroSec,
    pomodoroRunning,
    focusRequested,
    showPomodoroModal,
    setShowPomodoroModal,
    startPomodoro,
    startFocusSession,
    togglePomodoro,
  };
}

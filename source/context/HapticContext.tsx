import React, { createContext, useCallback, useContext, useState } from 'react';
import { useWebHaptics } from 'web-haptics/react';
import type { HapticInput } from 'web-haptics';

// True on any touch device (iOS or Android). The web-haptics library handles
// platform differences internally: navigator.vibrate on Android, and the
// <input type="checkbox" switch> click trick on iOS Safari.
const isTouchDevice = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

interface HapticContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  trigger: (pattern: HapticInput) => void;
  isTouchDevice: boolean;
}

const HapticContext = createContext<HapticContextValue | null>(null);

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem('haptics_enabled');
    return stored === null ? true : stored === 'true';
  });

  const { trigger: rawTrigger } = useWebHaptics();

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem('haptics_enabled', String(v));
  }, []);

  const trigger = useCallback((pattern: HapticInput) => {
    if (!enabled) return;
    rawTrigger(pattern); // library handles Android (vibrate) and iOS (checkbox trick)
  }, [enabled, rawTrigger]);

  return (
    <HapticContext.Provider value={{ enabled, setEnabled, trigger, isTouchDevice }}>
      {children}
    </HapticContext.Provider>
  );
}

export function useHaptic(): HapticContextValue {
  const ctx = useContext(HapticContext);
  if (!ctx) throw new Error('useHaptic must be used inside HapticProvider');
  return ctx;
}

import React, { createContext, useCallback, useContext, useState } from 'react';
import { useWebHaptics } from 'web-haptics/react';
import { WebHaptics } from 'web-haptics';
import type { HapticInput } from 'web-haptics';

interface HapticContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  trigger: (pattern: HapticInput) => void;
  isSupported: boolean;
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
    if (!enabled || !WebHaptics.isSupported) return;
    rawTrigger(pattern);
  }, [enabled, rawTrigger]);

  return (
    <HapticContext.Provider value={{ enabled, setEnabled, trigger, isSupported: WebHaptics.isSupported }}>
      {children}
    </HapticContext.Provider>
  );
}

export function useHaptic(): HapticContextValue {
  const ctx = useContext(HapticContext);
  if (!ctx) throw new Error('useHaptic must be used inside HapticProvider');
  return ctx;
}

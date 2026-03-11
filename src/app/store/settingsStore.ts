import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
  setPriceDropThreshold: (threshold: number) => void;
  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  priceDropThreshold: number;
  resetSettings: () => void;
  themePreference: 'light' | 'dark' | 'system';
}

const defaultSettings = {
  priceDropThreshold: 5,
  pushEnabled: false,
  themePreference: 'system' as const,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      resetSettings: () => set(defaultSettings),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setPriceDropThreshold: (priceDropThreshold: number) =>
        set({ priceDropThreshold }),
    }),
    {
      migrate: (persistedState) => {
        const state = persistedState as Partial<SettingsStore> & {
          priceDropThreshold?: number | string;
        };

        return {
          priceDropThreshold: Number(state.priceDropThreshold) || defaultSettings.priceDropThreshold,
          pushEnabled:
            typeof state.pushEnabled === 'boolean'
              ? state.pushEnabled
              : defaultSettings.pushEnabled,
          themePreference:
            state.themePreference === 'light' ||
            state.themePreference === 'dark' ||
            state.themePreference === 'system'
              ? state.themePreference
              : defaultSettings.themePreference,
        };
      },
      name: 'lowest-alert-settings',
      partialize: (state) => ({
        priceDropThreshold: state.priceDropThreshold,
        pushEnabled: state.pushEnabled,
        themePreference: state.themePreference,
      }),
      version: 2,
    }
  )
);

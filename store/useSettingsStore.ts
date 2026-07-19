"use client";

import { create } from "zustand";
import type { ReaderSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { getSettings, saveSettings } from "@/lib/storage";

interface SettingsState {
  settings: ReaderSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<ReaderSettings>) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    const settings = await getSettings();
    set({ settings: { ...DEFAULT_SETTINGS, ...settings }, loaded: true });
  },
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    // Debounce persistence so rapid slider changes don't hammer IndexedDB.
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveSettings(settings), 250);
  },
}));

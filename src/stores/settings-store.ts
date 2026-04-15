/**
 * Settings Store — Zustand store for app settings.
 * Uses async IPC adapter (mock in web, Tauri IPC in native).
 */

import { create } from "zustand";
import type { Settings } from "@/types/alarm";
import { ThemeMode, DEFAULT_SETTINGS } from "@/types/alarm";
import * as ipc from "@/lib/ipc-adapter";

interface SettingsStore {
  settings: Settings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleIs24Hour: () => Promise<void>;
}

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyThemeClass(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove("dark");

  if (theme === ThemeMode.Dark) {
    root.classList.add("dark");
  } else if (theme === ThemeMode.System) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    }
  }
}

function applyAccentColor(hex: string): void {
  const hsl = hexToHSL(hex);
  if (!hsl) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
}

const SKIN_CLASSES = ["skin-midnight", "skin-sunrise", "skin-ocean", "skin-forest", "skin-vscode", "skin-dracula", "skin-monokai", "skin-nord", "skin-solarized-dark", "skin-solarized-light", "skin-catppuccin"];

function applySkin(skin: string): void {
  const root = document.documentElement;
  SKIN_CLASSES.forEach((cls) => root.classList.remove(cls));
  if (skin && skin !== "default") {
    root.classList.add(`skin-${skin}`);
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await ipc.getSettings();
      set({ settings });
      applyThemeClass(settings.Theme);
      applyAccentColor(settings.AccentColor);
      applySkin(settings.ThemeSkin ?? "default");
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (partial) => {
    const updated = await ipc.updateSettings(partial);
    set({ settings: updated });
    if (partial.Theme !== undefined) {
      applyThemeClass(partial.Theme);
    }
    if (partial.AccentColor !== undefined) {
      applyAccentColor(partial.AccentColor);
    }
    if (partial.ThemeSkin !== undefined) {
      applySkin(partial.ThemeSkin);
    }
  },

  setTheme: async (theme) => {
    await get().updateSettings({ Theme: theme });
  },

  toggleIs24Hour: async () => {
    const current = get().settings.Is24Hour;
    await get().updateSettings({ Is24Hour: !current });
  },
}));

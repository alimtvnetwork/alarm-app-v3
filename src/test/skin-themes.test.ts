/**
 * Skin theme tests — verifies settings persistence for skin changes.
 * Note: "default" is normalized to DEFAULT_SKIN ("vscode") by resolveSkin().
 */

import { describe, expect, it, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/settings-store";

const DEFAULT_SKIN = "vscode";

describe("Skin Theme Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-skin");
  });

  it("updates ThemeSkin setting", async () => {
    await useSettingsStore.getState().updateSettings({ ThemeSkin: "midnight" });
    expect(useSettingsStore.getState().settings.ThemeSkin).toBe("midnight");
  });

  it("reverts to default skin", async () => {
    await useSettingsStore.getState().updateSettings({ ThemeSkin: "ocean" });
    await useSettingsStore.getState().updateSettings({ ThemeSkin: "default" });
    // "default" is normalized to DEFAULT_SKIN
    expect(useSettingsStore.getState().settings.ThemeSkin).toBe(DEFAULT_SKIN);
  });

  it("validates all known skin values", async () => {
    const skins = ["midnight", "sunrise", "ocean", "forest", "vscode", "dracula", "monokai", "nord"];
    for (const skin of skins) {
      await useSettingsStore.getState().updateSettings({ ThemeSkin: skin });
      expect(useSettingsStore.getState().settings.ThemeSkin).toBe(skin);
    }
  });
});

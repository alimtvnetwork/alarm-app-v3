/**
 * IPC Adapter — shared utilities and IS_TAURI flag.
 */

import { safeInvoke } from "@/stores/error-store";

export const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

export async function getMock() {
  return import("@/lib/mock-ipc");
}

export async function getTauri() {
  return import("@/lib/tauri-commands");
}

export { safeInvoke };

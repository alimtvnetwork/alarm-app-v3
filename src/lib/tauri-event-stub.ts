// Stub for @tauri-apps/api — used in web preview where Tauri is unavailable.
// This file is aliased to both @tauri-apps/api/event AND @tauri-apps/api/core.

// event API stubs
export async function listen(): Promise<() => void> {
  return () => {};
}

export async function emit(): Promise<void> {}

// core API stubs
export async function invoke(): Promise<null> {
  return null;
}

/**
 * Error Store (Zustand) — Alarm App
 * Source: spec/03-error-manage-spec/04-error-manage-spec/02-error-architecture/04-error-modal/02-react-components/02-error-store.md
 * Captures, queues, and manages all application errors.
 */

import { create } from "zustand";
import type {
  CapturedError,
  ErrorContext,
  IpcError,
  ErrorSeverity,
} from "@/types/errors";
import {
  ErrorCode,
  getSeverityForCode,
  getToastTypeForCode,
  AppError,
} from "@/types/errors";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────

const MAX_RECENT_ERRORS = 50;
const IPC_TIMEOUT_MS = 15000;

// ─── Store Interface ─────────────────────────────────────────────

interface ErrorStore {
  // State
  recentErrors: CapturedError[];
  errorQueue: CapturedError[];
  currentQueueIndex: number;
  selectedError: CapturedError | null;
  isModalOpen: boolean;

  // Actions
  captureError: (ipcError: IpcError, context?: ErrorContext) => CapturedError;
  captureException: (error: Error | string, context?: ErrorContext) => CapturedError;
  openErrorModal: (error: CapturedError) => void;
  openErrorQueue: (errors: CapturedError[], startIndex?: number) => void;
  navigateQueue: (direction: "prev" | "next") => void;
  closeErrorModal: () => void;
  clearRecentErrors: () => void;
  markErrorSynced: (errorId: string) => void;
  getPendingSyncErrors: () => CapturedError[];
  getErrorsMarkdown: () => string;
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildCapturedError(
  code: string,
  message: string,
  severity: ErrorSeverity,
  context: ErrorContext,
  stack?: string,
): CapturedError {
  return {
    id: crypto.randomUUID(),
    code,
    message,
    severity,
    context: {
      ...context,
      timestamp: context.timestamp ?? new Date().toISOString(),
      route: context.route ?? window.location.pathname,
    },
    stack,
    createdAt: new Date().toISOString(),
    isSynced: false,
  };
}

function showToast(captured: CapturedError): void {
  const toastType = getToastTypeForCode(captured.code);
  const label = `[${captured.code}] ${captured.message}`;

  if (toastType === "warning") {
    toast.warning(label);
  } else {
    toast.error(label);
  }
}

// ─── Store ───────────────────────────────────────────────────────

export const useErrorStore = create<ErrorStore>((set, get) => ({
  recentErrors: [],
  errorQueue: [],
  currentQueueIndex: 0,
  selectedError: null,
  isModalOpen: false,

  captureError(ipcError, context = {}) {
    const severity = getSeverityForCode(ipcError.Code);
    const captured = buildCapturedError(
      ipcError.Code,
      ipcError.Message,
      severity,
      context,
    );
    set((s) => ({
      recentErrors: [captured, ...s.recentErrors].slice(0, MAX_RECENT_ERRORS),
    }));
    showToast(captured);
    return captured;
  },

  captureException(error, context = {}) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const stack = isError ? error.stack : undefined;
    const code = isError && error instanceof AppError ? error.code : "UnhandledException";
    const severity = getSeverityForCode(code);
    const captured = buildCapturedError(code, message, severity, context, stack);
    set((s) => ({
      recentErrors: [captured, ...s.recentErrors].slice(0, MAX_RECENT_ERRORS),
    }));
    showToast(captured);
    return captured;
  },

  openErrorModal(error) {
    set({ selectedError: error, isModalOpen: true, errorQueue: [error], currentQueueIndex: 0 });
  },

  openErrorQueue(errors, startIndex = 0) {
    set({
      errorQueue: errors,
      currentQueueIndex: startIndex,
      selectedError: errors[startIndex] ?? null,
      isModalOpen: true,
    });
  },

  navigateQueue(direction) {
    const { errorQueue, currentQueueIndex } = get();
    if (errorQueue.length === 0) return;
    const next =
      direction === "next"
        ? (currentQueueIndex + 1) % errorQueue.length
        : (currentQueueIndex - 1 + errorQueue.length) % errorQueue.length;
    set({ currentQueueIndex: next, selectedError: errorQueue[next] });
  },

  closeErrorModal() {
    set({ isModalOpen: false, selectedError: null, errorQueue: [], currentQueueIndex: 0 });
  },

  clearRecentErrors() {
    set({ recentErrors: [] });
  },

  markErrorSynced(errorId) {
    set((s) => ({
      recentErrors: s.recentErrors.map((e) =>
        e.id === errorId ? { ...e, isSynced: true } : e,
      ),
    }));
  },

  getPendingSyncErrors() {
    return get().recentErrors.filter((e) => !e.isSynced);
  },

  getErrorsMarkdown() {
    const errors = get().recentErrors;
    if (errors.length === 0) return "No errors captured.";
    return errors
      .map(
        (e) =>
          `### [${e.code}] ${e.message}\n- **Severity:** ${e.severity}\n- **Time:** ${e.createdAt}\n- **Route:** ${e.context.route ?? "unknown"}\n- **Source:** ${e.context.source ?? "unknown"}`,
      )
      .join("\n\n");
  },
}));

// ─── safeInvoke — wraps any async IPC call with error capture ────

export async function safeInvoke<T>(
  fn: () => Promise<T>,
  context?: ErrorContext,
): Promise<T | null> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new AppError(ErrorCode.IpcTimeout, `IPC timeout after ${IPC_TIMEOUT_MS}ms`)),
          IPC_TIMEOUT_MS,
        ),
      ),
    ]);
    return result;
  } catch (err) {
    useErrorStore.getState().captureException(
      err instanceof Error ? err : String(err),
      context,
    );
    return null;
  }
}

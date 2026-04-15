import { describe, it, expect, vi, beforeEach } from "vitest";
import { useErrorStore, safeInvoke } from "@/stores/error-store";
import { ErrorCode, AppError } from "@/types/errors";

// Mock sonner toast to avoid DOM side-effects
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function resetStore() {
  useErrorStore.setState({
    recentErrors: [],
    errorQueue: [],
    currentQueueIndex: 0,
    selectedError: null,
    isModalOpen: false,
  });
}

describe("useErrorStore", () => {
  beforeEach(resetStore);

  // ─── captureError ────────────────────────────────────────────

  it("captures an IPC error with correct code and severity", () => {
    const captured = useErrorStore.getState().captureError(
      { Code: ErrorCode.Database, Message: "table locked" },
      { source: "test" },
    );

    expect(captured.code).toBe(ErrorCode.Database);
    expect(captured.message).toBe("table locked");
    expect(captured.severity).toBe("critical");
    expect(captured.isSynced).toBe(false);
    expect(useErrorStore.getState().recentErrors).toHaveLength(1);
  });

  it("limits recent errors to 50", () => {
    const store = useErrorStore.getState();
    for (let i = 0; i < 55; i++) {
      store.captureError({ Code: ErrorCode.Validation, Message: `err-${i}` });
    }
    expect(useErrorStore.getState().recentErrors).toHaveLength(50);
    expect(useErrorStore.getState().recentErrors[0].message).toBe("err-54");
  });

  // ─── captureException ────────────────────────────────────────

  it("captures an Error instance with stack trace", () => {
    const err = new Error("boom");
    const captured = useErrorStore.getState().captureException(err);

    expect(captured.code).toBe("UnhandledException");
    expect(captured.message).toBe("boom");
    expect(captured.stack).toBeDefined();
  });

  it("captures an AppError with its code", () => {
    const err = new AppError(ErrorCode.Audio, "codec missing");
    const captured = useErrorStore.getState().captureException(err);

    expect(captured.code).toBe(ErrorCode.Audio);
    expect(captured.severity).toBe("error");
  });

  it("captures a string as error", () => {
    const captured = useErrorStore.getState().captureException("something failed");

    expect(captured.message).toBe("something failed");
    expect(captured.code).toBe("UnhandledException");
  });

  // ─── Queue navigation ───────────────────────────────────────

  it("opens error queue and navigates forward with wrap-around", () => {
    const store = useErrorStore.getState();
    const e1 = store.captureError({ Code: ErrorCode.Audio, Message: "err1" });
    const e2 = store.captureError({ Code: ErrorCode.Validation, Message: "err2" });
    const e3 = store.captureError({ Code: ErrorCode.Database, Message: "err3" });

    store.openErrorQueue([e1, e2, e3], 0);
    expect(useErrorStore.getState().selectedError?.id).toBe(e1.id);

    store.navigateQueue("next");
    expect(useErrorStore.getState().selectedError?.id).toBe(e2.id);

    store.navigateQueue("next");
    expect(useErrorStore.getState().selectedError?.id).toBe(e3.id);

    // Wrap around
    store.navigateQueue("next");
    expect(useErrorStore.getState().selectedError?.id).toBe(e1.id);
  });

  it("navigates backward with wrap-around", () => {
    const store = useErrorStore.getState();
    const e1 = store.captureError({ Code: ErrorCode.Audio, Message: "a" });
    const e2 = store.captureError({ Code: ErrorCode.Audio, Message: "b" });

    store.openErrorQueue([e1, e2], 0);
    store.navigateQueue("prev");
    expect(useErrorStore.getState().selectedError?.id).toBe(e2.id);
  });

  // ─── clearRecentErrors ──────────────────────────────────────

  it("clears all recent errors", () => {
    const store = useErrorStore.getState();
    store.captureError({ Code: ErrorCode.Audio, Message: "x" });
    store.captureError({ Code: ErrorCode.Audio, Message: "y" });
    expect(useErrorStore.getState().recentErrors).toHaveLength(2);

    store.clearRecentErrors();
    expect(useErrorStore.getState().recentErrors).toHaveLength(0);
  });

  // ─── markErrorSynced ────────────────────────────────────────

  it("marks an error as synced", () => {
    const store = useErrorStore.getState();
    const captured = store.captureError({ Code: ErrorCode.Audio, Message: "x" });

    store.markErrorSynced(captured.id);
    const updated = useErrorStore.getState().recentErrors.find((e) => e.id === captured.id);
    expect(updated?.isSynced).toBe(true);
  });

  it("getPendingSyncErrors excludes synced errors", () => {
    const store = useErrorStore.getState();
    const e1 = store.captureError({ Code: ErrorCode.Audio, Message: "a" });
    store.captureError({ Code: ErrorCode.Audio, Message: "b" });

    store.markErrorSynced(e1.id);
    expect(store.getPendingSyncErrors()).toHaveLength(1);
  });

  // ─── getErrorsMarkdown ──────────────────────────────────────

  it("returns markdown for captured errors", () => {
    const store = useErrorStore.getState();
    store.captureError({ Code: ErrorCode.Database, Message: "db fail" }, { source: "test" });

    const md = store.getErrorsMarkdown();
    expect(md).toContain("### [Database] db fail");
    expect(md).toContain("**Source:** test");
  });

  it("returns placeholder when no errors", () => {
    expect(useErrorStore.getState().getErrorsMarkdown()).toBe("No errors captured.");
  });

  // ─── closeErrorModal ────────────────────────────────────────

  it("resets modal state on close", () => {
    const store = useErrorStore.getState();
    const err = store.captureError({ Code: ErrorCode.Audio, Message: "x" });
    store.openErrorModal(err);
    expect(useErrorStore.getState().isModalOpen).toBe(true);

    store.closeErrorModal();
    expect(useErrorStore.getState().isModalOpen).toBe(false);
    expect(useErrorStore.getState().selectedError).toBeNull();
    expect(useErrorStore.getState().errorQueue).toHaveLength(0);
  });
});

// ─── safeInvoke ──────────────────────────────────────────────────

describe("safeInvoke", () => {
  beforeEach(resetStore);

  it("returns result on success", async () => {
    const result = await safeInvoke(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(useErrorStore.getState().recentErrors).toHaveLength(0);
  });

  it("captures error and returns null on failure", async () => {
    const result = await safeInvoke(
      () => Promise.reject(new Error("fail")),
      { source: "test" },
    );
    expect(result).toBeNull();
    expect(useErrorStore.getState().recentErrors).toHaveLength(1);
    expect(useErrorStore.getState().recentErrors[0].message).toBe("fail");
  });

  it("captures AppError with its specific code", async () => {
    const result = await safeInvoke(
      () => Promise.reject(new AppError(ErrorCode.ExportImport, "export broke")),
    );
    expect(result).toBeNull();
    expect(useErrorStore.getState().recentErrors[0].code).toBe(ErrorCode.ExportImport);
  });

  it("times out and captures IpcTimeout error", async () => {
    // Override timeout to 50ms for test speed
    const result = await safeInvoke(
      () => new Promise((resolve) => setTimeout(resolve, 20000)),
      { source: "timeout-test" },
    );
    expect(result).toBeNull();
    const errors = useErrorStore.getState().recentErrors;
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(ErrorCode.IpcTimeout);
  }, 20000);
});

/**
 * Error Type System — Alarm App
 * Source: spec/03-error-manage-spec + src-tauri/src/errors.rs
 * Mirrors the 13-variant AlarmAppError enum, 7-variant WebhookError enum, and IPC error response format.
 */

// ─── Error Code Enum (matches Rust error_code()) ─────────────────

export enum ErrorCode {
  Database = "Database",
  Audio = "Audio",
  IpcTimeout = "IpcTimeout",
  FileNotFound = "FileNotFound",
  Migration = "Migration",
  NotificationDenied = "NotificationDenied",
  InvalidSoundFormat = "InvalidSoundFormat",
  SymlinkRejected = "SymlinkRejected",
  SoundFileTooLarge = "SoundFileTooLarge",
  RestrictedPath = "RestrictedPath",
  ConcurrentModification = "ConcurrentModification",
  Validation = "Validation",
  ExportImport = "ExportImport",
}

// ─── Webhook Error Code Enum (7 variants — spec 12-smart-features.md) ──

export enum WebhookErrorCode {
  InvalidUrl = "WebhookInvalidUrl",
  InsecureScheme = "WebhookInsecureScheme",
  BlockedHost = "WebhookBlockedHost",
  MissingHost = "WebhookMissingHost",
  PrivateIp = "WebhookPrivateIp",
  NonStandardPort = "WebhookNonStandardPort",
  RequestFailed = "WebhookRequestFailed",
}

// ─── IPC Error Response (matches IpcErrorResponse struct) ────────

export interface IpcError {
  Message: string;
  Code: ErrorCode | string;
}

// ─── Error Severity ──────────────────────────────────────────────

export type ErrorSeverity = "critical" | "error" | "warning" | "info";

// ─── Error Context (enrichment metadata) ─────────────────────────

export interface ErrorContext {
  source?: string;
  triggerComponent?: string;
  triggerAction?: string;
  route?: string;
  timestamp?: string;
}

// ─── Captured Error (stored in error array) ──────────────────────

export interface CapturedError {
  id: string;
  code: ErrorCode | string;
  message: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  stack?: string;
  createdAt: string;
  isSynced: boolean;
}

// ─── Error-to-Severity Mapping ───────────────────────────────────

const SEVERITY_MAP: Record<string, ErrorSeverity> = {
  [ErrorCode.Database]: "critical",
  [ErrorCode.Migration]: "critical",
  [ErrorCode.Audio]: "error",
  [ErrorCode.IpcTimeout]: "error",
  [ErrorCode.FileNotFound]: "error",
  [ErrorCode.NotificationDenied]: "warning",
  [ErrorCode.InvalidSoundFormat]: "warning",
  [ErrorCode.SymlinkRejected]: "warning",
  [ErrorCode.SoundFileTooLarge]: "warning",
  [ErrorCode.RestrictedPath]: "warning",
  [ErrorCode.ConcurrentModification]: "error",
  [ErrorCode.Validation]: "warning",
  [ErrorCode.ExportImport]: "error",
  // WebhookError variants — all warnings (SSRF validation failures)
  [WebhookErrorCode.InvalidUrl]: "warning",
  [WebhookErrorCode.InsecureScheme]: "warning",
  [WebhookErrorCode.BlockedHost]: "warning",
  [WebhookErrorCode.MissingHost]: "warning",
  [WebhookErrorCode.PrivateIp]: "warning",
  [WebhookErrorCode.NonStandardPort]: "warning",
  [WebhookErrorCode.RequestFailed]: "error",
};

export function getSeverityForCode(code: string): ErrorSeverity {
  return SEVERITY_MAP[code] ?? "error";
}

// ─── Error-to-Toast Mapping ──────────────────────────────────────

export type ToastType = "error" | "warning" | "info";

const TOAST_MAP: Record<string, ToastType> = {
  [ErrorCode.Database]: "error",
  [ErrorCode.Audio]: "error",
  [ErrorCode.IpcTimeout]: "error",
  [ErrorCode.Migration]: "error",
  [ErrorCode.FileNotFound]: "warning",
  [ErrorCode.NotificationDenied]: "warning",
  [ErrorCode.InvalidSoundFormat]: "warning",
  [ErrorCode.SymlinkRejected]: "warning",
  [ErrorCode.SoundFileTooLarge]: "warning",
  [ErrorCode.RestrictedPath]: "warning",
  [ErrorCode.ConcurrentModification]: "error",
  [ErrorCode.Validation]: "warning",
  [ErrorCode.ExportImport]: "error",
  // WebhookError variants
  [WebhookErrorCode.InvalidUrl]: "warning",
  [WebhookErrorCode.InsecureScheme]: "warning",
  [WebhookErrorCode.BlockedHost]: "warning",
  [WebhookErrorCode.MissingHost]: "warning",
  [WebhookErrorCode.PrivateIp]: "warning",
  [WebhookErrorCode.NonStandardPort]: "warning",
  [WebhookErrorCode.RequestFailed]: "error",
};

export function getToastTypeForCode(code: string): ToastType {
  return TOAST_MAP[code] ?? "error";
}

// ─── AppError helper (throw-friendly) ────────────────────────────

export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;

  constructor(
    code: ErrorCode | string,
    message: string,
    context?: ErrorContext,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.severity = getSeverityForCode(code);
    this.context = context ?? {};
  }

  toIpcError(): IpcError {
    return { Message: this.message, Code: this.code };
  }
}

/**
 * Shared chart styling constants for analytics components.
 */

export const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

export const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--snooze))",
  "hsl(var(--dismiss))",
  "hsl(var(--destructive))",
] as const;

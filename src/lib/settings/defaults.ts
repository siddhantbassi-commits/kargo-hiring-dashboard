/**
 * Default application settings, persisted into app_settings on first seed.
 * These are development defaults per the spec — change them in the dashboard
 * (or directly in app_settings) rather than editing this file for a live deploy.
 */
export const DEFAULT_SETTINGS = {
  SHORTLIST_THRESHOLD: 70,
  TOP_CANDIDATES_FOR_BRIEF: 5,
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

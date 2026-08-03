export const SESSION_STARTED_COOKIE = "okado_session_started_at";
export const SESSION_LAST_ACTIVITY_COOKIE = "okado_session_last_activity_at";
export const SESSION_STARTED_STORAGE_PREFIX = "okado_session_started_at:";
export const SESSION_LAST_ACTIVITY_STORAGE_PREFIX = "okado_session_last_activity_at:";

export const SESSION_INACTIVITY_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;

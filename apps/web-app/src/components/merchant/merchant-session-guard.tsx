"use client";

import { useEffect, useRef } from "react";

import {
  SESSION_INACTIVITY_MS,
  SESSION_LAST_ACTIVITY_COOKIE,
  SESSION_LAST_ACTIVITY_STORAGE_PREFIX,
  SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_SECONDS,
  SESSION_STARTED_COOKIE,
  SESSION_STARTED_STORAGE_PREFIX,
} from "@/lib/session-security";

function readCookie(name: string) {
  const value = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

function readStorageTimestamp(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

function writeStorageTimestamp(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Private browsing may disable localStorage; the cookie remains the fallback.
  }
}

function removeStorageTimestamp(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function MerchantSessionGuard({ userId }: { userId: string }) {
  const signOutStarted = useRef(false);

  useEffect(() => {
    const startedStorageKey = `${SESSION_STARTED_STORAGE_PREFIX}${userId}`;
    const activityStorageKey = `${SESSION_LAST_ACTIVITY_STORAGE_PREFIX}${userId}`;
    const now = Date.now();
    const cookieStartedAt = Number(readCookie(SESSION_STARTED_COOKIE));
    const storedStartedAt = readStorageTimestamp(startedStorageKey);
    const startedAt = Number.isFinite(cookieStartedAt) && cookieStartedAt > 0
      ? cookieStartedAt
      : storedStartedAt;
    const cookieLastActivityAt = Number(readCookie(SESSION_LAST_ACTIVITY_COOKIE));
    const storedLastActivityAt = readStorageTimestamp(activityStorageKey);
    const lastActivityAt = Number.isFinite(cookieLastActivityAt) && cookieLastActivityAt > 0
      ? cookieLastActivityAt
      : storedLastActivityAt;
    const activeStartedAt = startedAt && startedAt > 0 ? startedAt : now;
    let activeLastActivityAt = lastActivityAt && lastActivityAt > 0 ? lastActivityAt : now;

    writeCookie(SESSION_STARTED_COOKIE, String(activeStartedAt), SESSION_MAX_AGE_MS / 1000);
    writeCookie(
      SESSION_LAST_ACTIVITY_COOKIE,
      String(activeLastActivityAt),
      SESSION_MAX_AGE_SECONDS,
    );
    writeStorageTimestamp(startedStorageKey, activeStartedAt);
    writeStorageTimestamp(activityStorageKey, activeLastActivityAt);

    async function expireSession() {
      if (signOutStarted.current) return;
      signOutStarted.current = true;
      removeStorageTimestamp(startedStorageKey);
      removeStorageTimestamp(activityStorageKey);

      try {
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "same-origin",
        });
      } finally {
        window.location.replace("/connexion?reason=session-expired");
      }
    }

    function isExpired() {
      const current = Date.now();
      return (
        current - activeStartedAt >= SESSION_MAX_AGE_MS ||
        current - activeLastActivityAt >= SESSION_INACTIVITY_MS
      );
    }

    if (isExpired()) {
      void expireSession();
      return;
    }

    let lastWriteAt = 0;
    const touchActivity = () => {
      const current = Date.now();
      if (current - lastWriteAt < 30_000) return;
      lastWriteAt = current;
      activeLastActivityAt = current;
      writeCookie(SESSION_LAST_ACTIVITY_COOKIE, String(current), SESSION_MAX_AGE_SECONDS);
      writeStorageTimestamp(activityStorageKey, current);
    };
    const checkSession = () => {
      if (isExpired()) void expireSession();
    };
    const intervalId = window.setInterval(checkSession, 60_000);
    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, touchActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", checkSession);

    return () => {
      window.clearInterval(intervalId);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, touchActivity);
      }
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [userId]);

  return null;
}

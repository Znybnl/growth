import { NextResponse } from "next/server";

import {
  SESSION_LAST_ACTIVITY_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_STARTED_COOKIE,
} from "@/lib/session-security";

export function setSessionSecurityCookies(response: NextResponse, now = Date.now()) {
  const common = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set(SESSION_STARTED_COOKIE, String(now), {
    ...common,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set(SESSION_LAST_ACTIVITY_COOKIE, String(now), {
    ...common,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

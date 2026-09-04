import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: true,
    logs: {
      serviceName: "okado-web",
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "production",
    },
  });
}

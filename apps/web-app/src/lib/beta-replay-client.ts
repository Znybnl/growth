"use client";

import type { PostHog } from "posthog-js";
import {
  BETA_REPLAY_REFRESH_MS, BETA_REPLAY_STOP_EVENT, BETA_REPLAY_VERSION,
  betaReplayPage, validBetaReplayLease,
} from "@/lib/beta-replay-contract";
import { BETA_REPLAY_BLOCK_SELECTOR, betaReplayUrl, maskBetaReplayAttribute, maskBetaReplayText } from "@/lib/beta-replay-privacy";

let recorder: PostHog | undefined;
let recorderLoading: Promise<PostHog> | undefined;
let allowedUntil = 0;
let currentSubject = "";
let generation = 0;

function mayRecord() {
  return allowedUntil > Date.now() && document.visibilityState === "visible" &&
    betaReplayPage(window.location.pathname) !== null;
}

export function stopBetaReplay() {
  // Revoke before stopping: flushing a queued snapshot must also pass before_send.
  allowedUntil = 0;
  generation += 1;
  try { recorder?.stopSessionRecording(); }
  catch { /* A recorder failure must never prevent signout or navigation. */ }
}

export function stopBetaReplayForSignOut() {
  stopBetaReplay();
  window.dispatchEvent(new Event(BETA_REPLAY_STOP_EVENT));
}

function getRecorder(subject: string): Promise<PostHog> {
  if (recorder) return Promise.resolve(recorder);
  if (!recorderLoading) recorderLoading = import("posthog-js").then(({ PostHog }) => {
    recorder = new PostHog().init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      persistence: "memory", disable_persistence: true,
      request_batching: false,
      opt_out_capturing_persistence_type: "localStorage",
      opt_out_capturing_cookie_prefix: "okado_beta_replay_optout_",
      person_profiles: "never",
      bootstrap: { distinctID: subject, isIdentifiedID: true },
      capture_pageview: false, capture_pageleave: false, autocapture: false,
      rageclick: false, capture_dead_clicks: false,
      capture_performance: false, capture_exceptions: false,
      disable_surveys: true, disable_product_tours: true,
      advanced_disable_feature_flags: true, remote_config_refresh_interval_ms: 0,
      enable_recording_console_log: false,
      disable_session_recording: true, disable_capture_url_hashes: true,
      session_recording: {
        maskAllInputs: true, maskTextSelector: "*", maskTextFn: maskBetaReplayText,
        maskAttributeFn: maskBetaReplayAttribute, blockSelector: BETA_REPLAY_BLOCK_SELECTOR,
        recordCrossOriginIframes: false, recordHeaders: false, recordBody: false,
        captureCanvas: { recordCanvas: false }, captureJsonLd: false,
        maskCapturedNetworkRequestFn: () => null,
        // Also covers rrweb's initial page URL; no queries, hashes or campaign IDs.
        maskNetworkRequestFn: request => ({ ...request, url: betaReplayUrl(request.url) }),
      },
      before_send(event) {
        if (!mayRecord() || event.event !== "$snapshot") return null;
        // Replay is not a back door for product events or user profiles.
        const properties: Record<string, unknown> = {};
        for (const key of ["$snapshot_data", "$snapshot_bytes", "$session_id", "$window_id", "$lib", "$lib_version"]) {
          if (event.properties[key] !== undefined) properties[key] = event.properties[key];
        }
        properties.token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        properties.distinct_id = currentSubject;
        properties.beta_replay_policy = BETA_REPLAY_VERSION;
        properties.$current_url = betaReplayUrl(window.location.href);
        return { ...event, distinct_id: currentSubject, properties };
      },
    }, "okado_beta_replay");
    return recorder;
  }).catch(error => { recorderLoading = undefined; throw error; });
  return recorderLoading;
}

/** A renewable, fail-closed server lease, independent of the ordinary consent SDK. */
export function startBetaReplayBoundary() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "false") return () => {};
  let disposed = false;
  let signedOut = false;
  let inFlight: AbortController | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;

  async function refresh() {
    if (disposed || signedOut || inFlight) return;
    if (document.visibilityState !== "visible" || !betaReplayPage(window.location.pathname)) {
      stopBetaReplay();
      return;
    }
    const requestGeneration = generation;
    const controller = new AbortController();
    inFlight = controller;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/analytics/beta-replay-policy", {
        credentials: "same-origin", cache: "no-store", signal: controller.signal,
      });
      const policy: unknown = response.ok ? await response.json() : null;
      if (disposed || signedOut || requestGeneration !== generation) return;
      if (!validBetaReplayLease(policy)) { stopBetaReplay(); return; }
      const sdk = await getRecorder(policy.subject);
      if (disposed || signedOut || requestGeneration !== generation || !validBetaReplayLease(policy)) return;
      if (currentSubject !== policy.subject) {
        allowedUntil = 0;
        sdk.stopSessionRecording();
        sdk.reset({ resetDeviceID: true, bootstrap: { distinctID: policy.subject, isIdentifiedID: true } });
        currentSubject = policy.subject;
      }
      allowedUntil = policy.expiresAt;
      clearTimeout(expiry);
      expiry = setTimeout(stopBetaReplay, Math.max(0, allowedUntil - Date.now()));
      sdk.startSessionRecording(true);
    } catch {
      if (!disposed && requestGeneration === generation) stopBetaReplay();
    }
    finally { clearTimeout(timeout); if (inFlight === controller) inFlight = undefined; }
  }

  function onVisibility() {
    if (document.visibilityState !== "visible") {
      stopBetaReplay(); inFlight?.abort(); inFlight = undefined;
    } else { void refresh(); }
  }
  function onSignOut() {
    signedOut = true; inFlight?.abort(); stopBetaReplay();
  }
  // No SDK import, storage or network outside the authorised SaaS routes.
  void refresh();
  const interval = setInterval(() => { void refresh(); }, BETA_REPLAY_REFRESH_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onVisibility);
  window.addEventListener(BETA_REPLAY_STOP_EVENT, onSignOut);
  return () => {
    disposed = true; inFlight?.abort(); clearInterval(interval); clearTimeout(expiry);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("focus", onVisibility);
    window.removeEventListener(BETA_REPLAY_STOP_EVENT, onSignOut);
    stopBetaReplay();
  };
}

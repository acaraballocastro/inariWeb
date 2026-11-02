import { deletePushSubscription, getPushConfig, savePushSubscription } from "./api";

export type PushState =
  | "unsupported" // no service workers or Push API (e.g. an in-app webview)
  | "needs-install" // iPhone/iPad: only home-screen apps receive push
  | "unavailable" // the server has no VAPID keys
  | "denied" // the user blocked notifications for the site
  | "off"
  | "on";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hasPushApi() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

/** What this device can do about push notifications right now. */
export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isInstalled()) return "needs-install";
  if (!hasPushApi()) return "unsupported";
  const config = await getPushConfig().catch(() => null);
  if (!config?.enabled) return "unavailable";
  if (Notification.permission === "denied") return "denied";
  const subscription = await (await registration()).pushManager.getSubscription();
  if (subscription) {
    // Keep the server in sync (e.g. after the browser renewed it).
    await savePushSubscription(subscription.toJSON()).catch(() => undefined);
    return "on";
  }
  return "off";
}

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Asks for permission (it must run on a tap) and registers this device. */
export async function enablePush(): Promise<PushState> {
  const config = await getPushConfig();
  if (!config.enabled) return "unavailable";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const sw = await registration();
  await navigator.serviceWorker.ready;
  const subscription = (await sw.pushManager.getSubscription()) ?? (await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(config.public_key) }));
  await savePushSubscription(subscription.toJSON());
  return "on";
}

/** Stops push on this device for the signed-in user. */
export async function disablePush(): Promise<PushState> {
  const subscription = hasPushApi() ? await (await registration()).pushManager.getSubscription() : null;
  if (subscription) {
    await deletePushSubscription(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return "off";
}

/** On sign-out the device stops receiving the user's notifications. */
export async function forgetDevice() {
  if (typeof window === "undefined" || !hasPushApi()) return;
  const sw = await navigator.serviceWorker.getRegistration("/");
  const subscription = await sw?.pushManager.getSubscription();
  if (!subscription) return;
  await deletePushSubscription(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

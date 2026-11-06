// Android/Chrome install prompt, kept from the moment the browser offers it.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function rememberInstallPrompt(event: Event) {
  deferred = event as InstallPromptEvent;
  listeners.forEach((listener) => listener());
}

export function canPromptInstall() {
  return deferred !== null;
}

export function onInstallPromptChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Shows the browser's install dialog; true when the user accepted. */
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  listeners.forEach((listener) => listener());
  return outcome === "accepted";
}

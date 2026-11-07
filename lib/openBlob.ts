/**
 * Opens a file fetched with the session in a new tab. The tab is opened
 * before the request (a tap allows pop-ups only synchronously) and filled
 * after; without pop-ups it opens in the same tab.
 */
export async function openBlob(load: () => Promise<Blob>) {
  const tab = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await load());
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    // The tab has loaded it by then.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

const DEFAULT_SERVER_URL = 'http://localhost:5055';

async function getServerUrl() {
  const { serverUrl } = await chrome.storage.sync.get('serverUrl');
  return serverUrl || DEFAULT_SERVER_URL;
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de récupérer l'image (${res.status})`);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'TRANSLATE_IMAGE') return false;

  (async () => {
    try {
      const imageBase64 = await fetchImageAsBase64(message.url);
      const serverUrl = await getServerUrl();
      const res = await fetch(`${serverUrl}/api/translate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Serveur a répondu ${res.status}`);
      sendResponse({ ok: true, blocks: data.blocks });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true; // réponse asynchrone
});

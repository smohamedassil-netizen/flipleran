const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggle');
const serverUrlInput = document.getElementById('serverUrl');

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function refreshStatus() {
  try {
    const tab = await currentTab();
    await ensureContentScript(tab.id);
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'STATUS' });
    statusEl.textContent = `Statut : ${res?.active ? 'activé sur cette page' : 'inactif'}`;
  } catch {
    statusEl.textContent = 'Statut : inactif';
  }
}

toggleBtn.addEventListener('click', async () => {
  const tab = await currentTab();
  await ensureContentScript(tab.id);
  const res = await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE' });
  statusEl.textContent = `Statut : ${res?.active ? 'activé sur cette page' : 'inactif'}`;
});

serverUrlInput.addEventListener('change', () => {
  chrome.storage.sync.set({ serverUrl: serverUrlInput.value.trim() });
});

(async () => {
  const { serverUrl } = await chrome.storage.sync.get('serverUrl');
  serverUrlInput.value = serverUrl || 'http://localhost:5055';
  refreshStatus();
})();

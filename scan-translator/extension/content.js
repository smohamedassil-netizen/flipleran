if (!window.__scanTranslatorInitialized) {
  window.__scanTranslatorInitialized = true;

  const MIN_SIZE = 250; // ignore icônes/avatars/pubs
  const state = {
    active: false,
    observer: null,
    entries: new Map(), // img -> { container, blocks, rafScheduled }
  };

  function isBigEnough(img) {
    return img.naturalWidth >= MIN_SIZE && img.naturalHeight >= MIN_SIZE;
  }

  function createOverlayContainer() {
    const el = document.createElement('div');
    el.className = 'scan-translator-overlay';
    Object.assign(el.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '2147483000',
    });
    document.body.appendChild(el);
    return el;
  }

  function positionContainer(img, container) {
    const rect = img.getBoundingClientRect();
    container.style.transform = `translate(${rect.left + window.scrollX}px, ${rect.top + window.scrollY}px)`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
  }

  function renderBlocks(img, container, blocks) {
    container.innerHTML = '';
    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;
    for (const block of blocks) {
      if (!block.translated) continue;
      const div = document.createElement('div');
      div.className = 'scan-translator-block';
      div.textContent = block.translated;
      Object.assign(div.style, {
        position: 'absolute',
        left: `${block.x * scaleX}px`,
        top: `${block.y * scaleY}px`,
        width: `${block.width * scaleX}px`,
        height: `${block.height * scaleY}px`,
        background: 'rgba(255,255,255,0.92)',
        color: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        borderRadius: '4px',
        fontFamily: 'sans-serif',
        fontSize: `${Math.max(10, Math.min(block.height * scaleY * 0.45, 16))}px`,
        lineHeight: '1.1',
        padding: '2px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      });
      container.appendChild(div);
    }
  }

  function reflowAll() {
    for (const [img, entry] of state.entries) {
      if (!img.isConnected) {
        entry.container.remove();
        state.entries.delete(img);
        continue;
      }
      positionContainer(img, entry.container);
    }
  }

  async function processImage(img) {
    const container = createOverlayContainer();
    state.entries.set(img, { container, blocks: [] });
    positionContainer(img, container);

    const url = img.currentSrc || img.src;
    const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE_IMAGE', url });
    if (!response) return;
    if (!response.ok) {
      console.warn('[Scan Translator]', response.error);
      return;
    }
    const entry = state.entries.get(img);
    if (!entry) return; // désactivé entre-temps
    entry.blocks = response.blocks;
    renderBlocks(img, container, response.blocks);
  }

  function scanImages() {
    if (!state.active) return;
    document.querySelectorAll('img').forEach((img) => {
      if (state.entries.has(img) || img.dataset.sttSeen) return;
      if (img.complete) {
        img.dataset.sttSeen = '1';
        if (isBigEnough(img)) processImage(img);
      } else {
        img.dataset.sttSeen = '1';
        img.addEventListener(
          'load',
          () => {
            delete img.dataset.sttSeen;
            if (state.active && isBigEnough(img) && !state.entries.has(img)) processImage(img);
          },
          { once: true }
        );
      }
    });
  }

  function activate() {
    state.active = true;
    scanImages();
    state.observer = new MutationObserver(() => scanImages());
    state.observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', reflowAll, { passive: true });
    window.addEventListener('resize', reflowAll);
  }

  function deactivate() {
    state.active = false;
    state.observer?.disconnect();
    state.observer = null;
    window.removeEventListener('scroll', reflowAll);
    window.removeEventListener('resize', reflowAll);
    for (const entry of state.entries.values()) entry.container.remove();
    state.entries.clear();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE') {
      state.active ? deactivate() : activate();
      sendResponse({ active: state.active });
    }
    if (message.type === 'STATUS') {
      sendResponse({ active: state.active });
    }
  });
}

// Search page logic.
(function () {
  const $ = (id) => document.getElementById(id);
  const drop = $('drop');
  const file = $('file');
  const preview = $('preview');
  const previewImg = $('previewImg');
  const faceStatus = $('faceStatus');
  const searchBtn = $('searchBtn');
  const scanning = $('scanning');
  const uploadCard = $('uploadCard');
  const resultsWrap = $('resultsWrap');
  const results = $('results');
  const resultMeta = $('resultMeta');
  const scanText = $('scanText');

  let queryDescriptor = null;

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function loadStats() {
    try {
      const r = await fetch('/api/sources');
      const d = await r.json();
      $('statPill').textContent = `🔎 ${d.total} consented profile${d.total === 1 ? '' : 's'} indexed`;
    } catch {
      $('statPill').textContent = 'Index unavailable';
    }
  }

  // Warm up models in the background so the first search feels instant.
  window.SF.loadModels().catch(() => {});

  drop.addEventListener('click', () => file.click());
  ['dragover', 'dragenter'].forEach((e) =>
    drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach((e) =>
    drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('drag'); })
  );
  drop.addEventListener('drop', (ev) => {
    if (ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]);
  });
  file.addEventListener('change', () => file.files[0] && handleFile(file.files[0]));

  async function handleFile(f) {
    if (!f.type.startsWith('image/')) return toast('Please choose an image.');
    queryDescriptor = null;
    searchBtn.disabled = true;

    const { img } = await window.SF.fileToImage(f);
    previewImg.src = img.src;
    preview.classList.add('show');
    faceStatus.className = 'face-status busy';
    faceStatus.textContent = 'Detecting face…';

    try {
      queryDescriptor = await window.SF.descriptorFromImage(img);
      if (queryDescriptor) {
        faceStatus.className = 'face-status ok';
        faceStatus.textContent = '✓ Face detected — ready to search';
        searchBtn.disabled = false;
      } else {
        faceStatus.className = 'face-status bad';
        faceStatus.textContent = '✕ No face found. Try a clearer, front-facing photo.';
      }
    } catch (e) {
      faceStatus.className = 'face-status bad';
      faceStatus.textContent = '✕ Could not process the photo.';
    }
  }

  searchBtn.addEventListener('click', async () => {
    if (!queryDescriptor) return;
    uploadCard.classList.add('hidden');
    scanning.classList.add('show');
    resultsWrap.classList.add('hidden');

    const phrases = ['Scanning consented profiles…', 'Comparing facial features…', 'Ranking matches…'];
    let i = 0;
    scanText.textContent = phrases[0];
    const cycle = setInterval(() => { i = (i + 1) % phrases.length; scanText.textContent = phrases[i]; }, 900);
    const started = Date.now();

    try {
      const r = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: queryDescriptor }),
      });
      const data = await r.json();
      // keep the scan visible briefly so it feels like work happened
      const wait = Math.max(0, 1200 - (Date.now() - started));
      setTimeout(() => { clearInterval(cycle); render(data); }, wait);
    } catch (e) {
      clearInterval(cycle);
      scanning.classList.remove('show');
      uploadCard.classList.remove('hidden');
      toast('Search failed. Is the server running?');
    }
  });

  function render(data) {
    scanning.classList.remove('show');
    resultsWrap.classList.remove('hidden');
    resultMeta.textContent = `${data.count} match${data.count === 1 ? '' : 'es'} · ${data.searched} searched`;
    results.innerHTML = '';

    if (!data.matches || data.matches.length === 0) {
      results.innerHTML = `<div class="empty card">🤔 No matching profiles found.<br><br>
        Nobody matching this face has opted in yet.</div>`;
      return;
    }

    for (const m of data.matches) {
      const el = document.createElement('div');
      el.className = 'match';
      const img = m.imageUrl
        ? `<img src="${m.imageUrl}" alt="">`
        : `<div style="width:58px;height:58px;border-radius:50%;background:#fff2c7;display:grid;place-items:center;font-size:24px">🙂</div>`;
      const link = m.profileUrl
        ? `<a class="open" href="${escapeAttr(m.profileUrl)}" target="_blank" rel="noopener"><button class="btn yellow btn-sm">Open</button></a>`
        : '';
      el.innerHTML = `
        <div class="ring">${img}<span class="pct">${m.score}%</span></div>
        <div class="info">
          <div class="name">${escapeHtml(m.name || 'Unnamed')}</div>
          <span class="badge">${escapeHtml(m.sourceName || m.sourceId)}${m.strong ? ' · strong match' : ''}</span>
        </div>
        ${link}`;
      results.appendChild(el);
    }
  }

  $('againBtn').addEventListener('click', () => {
    resultsWrap.classList.add('hidden');
    uploadCard.classList.remove('hidden');
    preview.classList.remove('show');
    searchBtn.disabled = true;
    file.value = '';
    queryDescriptor = null;
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeAttr(s) {
    const u = String(s);
    return /^https?:\/\//i.test(u) ? escapeHtml(u) : '#';
  }

  loadStats();
})();

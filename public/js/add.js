// "Add me" (opt-in) page logic.
(function () {
  const $ = (id) => document.getElementById(id);
  const drop = $('drop');
  const file = $('file');
  const preview = $('preview');
  const previewImg = $('previewImg');
  const faceStatus = $('faceStatus');
  const submitBtn = $('submitBtn');
  const consent = $('consent');
  const name = $('name');

  let descriptor = null;
  let dataUrl = null;
  let createdId = null;

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  function refresh() {
    submitBtn.disabled = !(descriptor && consent.checked && name.value.trim().length >= 2);
  }

  window.SF.loadModels().catch(() => {});

  drop.addEventListener('click', () => file.click());
  ['dragover', 'dragenter'].forEach((e) =>
    drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('drag'); })
  );
  ['dragleave', 'drop'].forEach((e) =>
    drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('drag'); })
  );
  drop.addEventListener('drop', (ev) => { if (ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]); });
  file.addEventListener('change', () => file.files[0] && handleFile(file.files[0]));
  consent.addEventListener('change', refresh);
  name.addEventListener('input', refresh);

  async function handleFile(f) {
    if (!f.type.startsWith('image/')) return toast('Please choose an image.');
    descriptor = null;
    refresh();

    const { img } = await window.SF.fileToImage(f);
    previewImg.src = img.src;
    preview.classList.add('show');
    faceStatus.className = 'face-status busy';
    faceStatus.textContent = 'Detecting face…';

    try {
      descriptor = await window.SF.descriptorFromImage(img);
      if (descriptor) {
        dataUrl = window.SF.shrinkDataUrl(img);
        faceStatus.className = 'face-status ok';
        faceStatus.textContent = '✓ Face detected';
      } else {
        faceStatus.className = 'face-status bad';
        faceStatus.textContent = '✕ No face found. Try a clearer photo.';
      }
    } catch {
      faceStatus.className = 'face-status bad';
      faceStatus.textContent = '✕ Could not process the photo.';
    }
    refresh();
  }

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';
    try {
      const r = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value.trim(),
          profileUrl: $('url').value.trim(),
          descriptor,
          image: dataUrl,
          consent: true,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed');
      createdId = data.id;
      $('formCard').classList.add('hidden');
      $('successCard').classList.remove('hidden');
      $('successName').textContent = `${data.name} is now findable by face.`;
    } catch (e) {
      toast(e.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add me to the index';
    }
  });

  $('removeBtn').addEventListener('click', async () => {
    if (!createdId) return;
    await fetch('/api/profiles/' + encodeURIComponent(createdId), { method: 'DELETE' });
    toast('Removed. You are no longer searchable.');
    setTimeout(() => (window.location.href = '/'), 1200);
  });
})();

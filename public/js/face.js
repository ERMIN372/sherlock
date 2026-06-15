// Shared face pipeline. Runs entirely in the browser using face-api.js.
// Exposes window.SF with model loading + descriptor extraction helpers.
(function () {
  const faceapi = window.faceapi;
  const MODEL_URL = '/models';
  let ready = null;

  function loadModels() {
    if (!ready) {
      ready = Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    }
    return ready;
  }

  // Read a File into an <img> element.
  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl: reader.result });
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Detect a single face and return its 128-d descriptor as a plain array.
  async function descriptorFromImage(imgEl) {
    await loadModels();
    const det = await faceapi
      .detectSingleFace(imgEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!det) return null;
    return Array.from(det.descriptor);
  }

  // Downscale a data URL so uploads stay small.
  function shrinkDataUrl(img, max = 512) {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  window.SF = { loadModels, fileToImage, descriptorFromImage, shrinkDataUrl };
})();

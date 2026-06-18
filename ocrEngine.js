var OcrEngine = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,
  SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  worker: null,
  isRunning: false,
  stopped: false,
  workerPath: null,
  corePath: null,
  langPath: null,
  _verified: false,

  init: function () {
    try {
      this.workerPath = chrome.runtime.getURL('libs/worker.min.js');
      this.corePath = chrome.runtime.getURL('libs/tesseract-core.wasm.js');
      this.langPath = chrome.runtime.getURL('libs/lang-data/');
    } catch (e) {
      this.workerPath = 'libs/worker.min.js';
      this.corePath = 'libs/tesseract-core.wasm.js';
      this.langPath = 'libs/lang-data/';
    }
  },

  verifyFiles: function () {
    var missing = [];
    if (typeof Tesseract === 'undefined') missing.push('tesseract.min.js');
    if (this.workerPath) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', this.workerPath, false);
        xhr.send();
        if (xhr.status >= 400) missing.push('worker.min.js');
      } catch (e) {
        missing.push('worker.min.js (could not verify)');
      }
    }
    if (this.langPath) {
      try {
        var xhr2 = new XMLHttpRequest();
        xhr2.open('HEAD', this.langPath + 'eng.traineddata', false);
        xhr2.send();
        if (xhr2.status >= 400) missing.push('eng.traineddata in libs/lang-data/');
      } catch (e) {
        missing.push('eng.traineddata (could not verify)');
      }
    }
    this._verified = true;
    return missing;
  },

  _checkLocalFile: function (url) {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.onload = function () { resolve(xhr.status < 400); };
      xhr.onerror = function () { resolve(false); };
      xhr.send();
    });
  },

  ensureFilesAvailable: async function () {
    this.init();
    var missing = [];
    if (typeof Tesseract === 'undefined') missing.push('tesseract.min.js');

    if (this.workerPath) {
      var hasWorker = await this._checkLocalFile(this.workerPath);
      if (!hasWorker) missing.push('worker.min.js');
    }
    if (this.langPath) {
      var hasLang = await this._checkLocalFile(this.langPath + 'eng.traineddata');
      if (!hasLang) missing.push('eng.traineddata in libs/lang-data/');
    }
    return missing;
  },

  loadImage: function (file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('No file provided.'));
        return;
      }
      if (file.size > OcrEngine.MAX_IMAGE_SIZE) {
        reject(new Error('Image is too large. Maximum allowed size is 10 MB.'));
        return;
      }
      var type = file.type.toLowerCase();
      var ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (OcrEngine.SUPPORTED_TYPES.indexOf(type) === -1 && OcrEngine.EXTENSIONS.indexOf(ext) === -1) {
        reject(new Error('Unsupported file type. Please upload JPG, PNG, or WEBP.'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) { resolve(e.target.result); };
      reader.onerror = function () { reject(new Error('Failed to read image file.')); };
      reader.readAsDataURL(file);
    });
  },

  preprocessImage: function (imageDataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var maxDim = 2000;
        var w = img.width;
        var h = img.height;
        if (w > maxDim || h > maxDim) {
          var ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var fullDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        var cropCanvas = document.createElement('canvas');
        var cropH = Math.round(h * 0.35);
        var cropY = h - cropH;
        cropCanvas.width = w;
        cropCanvas.height = cropH;
        var cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(img, 0, cropY, w, cropH, 0, 0, w, cropH);

        var imageData = cropCtx.getImageData(0, 0, w, cropH);
        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
          var r = data[i];
          var g = data[i + 1];
          var b = data[i + 2];
          var gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          if (gray < 30) gray = 0;
          if (gray > 225) gray = 255;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        cropCtx.putImageData(imageData, 0, 0);
        var cropDataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);

        resolve({ full: fullDataUrl, crop: cropDataUrl, width: w, height: h });
      };
      img.onerror = function () { resolve({ full: imageDataUrl, crop: imageDataUrl, width: 0, height: 0 }); };
      img.src = imageDataUrl;
    });
  },

  runOCR: async function (imageDataUrl, callbacks) {
    if (this.isRunning) {
      if (callbacks && callbacks.onError) callbacks.onError('OCR is already running.');
      return;
    }

    if (typeof Tesseract === 'undefined') {
      if (callbacks && callbacks.onError) {
        callbacks.onError('OCR library (tesseract.min.js) is missing. Please ensure libs/tesseract.min.js exists and reload the extension.');
      }
      return;
    }

    this.init();

    var missingFiles = await this.ensureFilesAvailable();
    if (missingFiles.length > 0) {
      this.isRunning = false;
      if (callbacks && callbacks.onError) {
        callbacks.onError('OCR language data is missing. Please add eng.traineddata inside libs/lang-data/. Run libs/download-lang-data.ps1 to download it automatically.');
      }
      return;
    }

    this.isRunning = true;
    this.stopped = false;

    try {
      if (callbacks && callbacks.onProgress) callbacks.onProgress('Loading OCR engine...', 10);

      if (!this.worker) {
        try {
          var workerConfig = { logger: function (m) {
            if (callbacks && callbacks.onProgress) {
              if (m.status === 'loading tesseract core') callbacks.onProgress('Loading OCR engine...', 15);
              else if (m.status === 'initializing tesseract') callbacks.onProgress('Initializing OCR engine...', 25);
              else if (m.status === 'loading language traineddata') callbacks.onProgress('Loading local language data...', 40);
              else if (m.status === 'initializing api') callbacks.onProgress('Initializing OCR...', 50);
              else if (m.status === 'recognizing text') callbacks.onProgress('Reading text...', 70);
            }
          }};

          if (this.workerPath) workerConfig.workerPath = this.workerPath;
          if (this.corePath) workerConfig.corePath = this.corePath;
          if (this.langPath) workerConfig.langPath = this.langPath;

          this.worker = await Tesseract.createWorker('eng', 1, workerConfig);
        } catch (err) {
          this.isRunning = false;
          if (callbacks && callbacks.onError) callbacks.onError('Failed to initialize OCR engine: ' + err.message + '. Ensure all Tesseract.js files are present in libs/.');
          return;
        }
      }

      if (callbacks && callbacks.onProgress) callbacks.onProgress('Preparing image...', 55);

      var preprocessed = await this.preprocessImage(imageDataUrl);

      if (this.stopped) { this.isRunning = false; return; }

      if (callbacks && callbacks.onProgress) callbacks.onProgress('Reading MRZ area...', 60);

      var cropResult;
      try {
        cropResult = await this.worker.recognize(preprocessed.crop);
      } catch (err) {
        cropResult = null;
      }

      if (this.stopped) { this.isRunning = false; return; }

      var primaryText = '';
      var primaryConfidence = 0;

      if (cropResult && cropResult.data) {
        primaryText = cropResult.data.text || '';
        primaryConfidence = cropResult.data.confidence || 0;
      }

      if (this.stopped) { this.isRunning = false; return; }

      var mrzCheck = MrzParser.extractPassportData(primaryText);

      if (!mrzCheck.success || !mrzCheck.mrzDetected) {
        if (callbacks && callbacks.onProgress) callbacks.onProgress('MRZ not found in crop, reading full image...', 70);

        var fullResult;
        try {
          fullResult = await this.worker.recognize(preprocessed.full);
        } catch (err) {
          this.isRunning = false;
          if (callbacks && callbacks.onError) callbacks.onError('OCR recognition failed: ' + err.message);
          return;
        }

        if (this.stopped) { this.isRunning = false; return; }

        primaryText = fullResult.data ? fullResult.data.text || '' : '';
        primaryConfidence = fullResult.data ? fullResult.data.confidence || 0 : 0;
      }

      if (callbacks && callbacks.onProgress) callbacks.onProgress('Detecting MRZ...', 85);

      var mrzResult = MrzParser.extractPassportData(primaryText);

      if (callbacks && callbacks.onProgress) callbacks.onProgress('Parsing passport data...', 92);

      mrzResult.ocrConfidence = Math.round(primaryConfidence);
      mrzResult.ocrRawText = primaryText;

      this.isRunning = false;

      if (callbacks && callbacks.onProgress) callbacks.onProgress('Complete', 100);
      if (callbacks && callbacks.onComplete) callbacks.onComplete({
        success: mrzResult.success,
        rawText: mrzResult.rawText,
        mrzLines: mrzResult.mrzLines,
        passportData: mrzResult.parsedData || null,
        confidence: mrzResult.ocrConfidence || 0,
        warnings: mrzResult.warnings || [],
        errors: !mrzResult.success ? [mrzResult.error] : [],
        ocrConfidence: mrzResult.ocrConfidence || 0,
        ocrRawText: mrzResult.ocrRawText || '',
        parsedData: mrzResult.parsedData || null
      });
    } catch (err) {
      this.isRunning = false;
      if (callbacks && callbacks.onError) callbacks.onError('OCR error: ' + err.message);
    }
  },

  stopOCR: function () {
    this.stopped = true;
    this.isRunning = false;
  },

  terminateWorker: function () {
    if (this.worker) {
      try { this.worker.terminate(); } catch (e) {}
      this.worker = null;
    }
    this.isRunning = false;
    this.stopped = false;
    this._verified = false;
  }
};

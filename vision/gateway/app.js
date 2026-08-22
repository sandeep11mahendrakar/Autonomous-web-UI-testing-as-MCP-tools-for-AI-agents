'use strict';

/**
 * Vision Gateway (Architecture B)
 *
 * Pipeline:
 *   URL -> screenshot -> YOLO detections + OCR words -> visual DOM -> LLM test cases
 *
 * Runs independently of Architecture A (DOM + memory log).
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.VISION_GATEWAY_PORT || 5000;

const SERVICES = {
  yolo: process.env.YOLO_SERVICE_URL || 'http://127.0.0.1:5001',
  ocr: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:5002',
  merge: process.env.MERGE_SERVICE_URL || 'http://127.0.0.1:5003',
  browser: process.env.BROWSER_SERVICE_URL || 'http://127.0.0.1:5004',
};

const OUTPUT_DIR = path.join(__dirname, '..', 'storage', 'outputs');

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/vision/health', async (_req, res) => {
  const checks = await Promise.all(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        return { name, status: response.data.status || 'ok' };
      } catch {
        return { name, status: 'unreachable' };
      }
    })
  );
  res.json({ service: 'vision-gateway', checks });
});

// ---------------------------------------------------------------------------
// Visual DOM pipeline
// ---------------------------------------------------------------------------

async function buildVisualDOM({ url, image_path: imagePath, image_b64: imageB64 }) {
  let resolvedPath = imagePath;
  let payload;

  if (url) {
    const capture = await axios.post(
      `${SERVICES.browser}/capture`,
      { url },
      { timeout: 45000 }
    );
    resolvedPath = capture.data.image_path;
  }

  if (!resolvedPath && !imageB64) {
    throw Object.assign(new Error('Provide image_path, image_b64, or url'), { statusCode: 400 });
  }

  if (resolvedPath) {
    if (!fs.existsSync(resolvedPath)) {
      throw Object.assign(new Error(`Screenshot not found: ${resolvedPath}`), { statusCode: 404 });
    }
    payload = { image_path: resolvedPath };
  } else {
    payload = { image_b64: imageB64 };
  }

  const [yoloRes, ocrRes] = await Promise.all([
    axios.post(`${SERVICES.yolo}/detect`, payload, { timeout: 60000 }),
    axios.post(`${SERVICES.ocr}/extract`, payload, { timeout: 60000 }),
  ]);

  const mergeRes = await axios.post(
    `${SERVICES.merge}/merge`,
    {
      detections: yoloRes.data.detections,
      ocr_words: ocrRes.data.words,
      image_size: yoloRes.data.image_size,
    },
    { timeout: 10000 }
  );

  const visualDOM = mergeRes.data;
  visualDOM.raw = {
    yolo_detections: yoloRes.data.detections.length,
    ocr_words_found: ocrRes.data.words.length,
    full_text: ocrRes.data.full_text,
  };

  if (url) visualDOM.source_url = url;

  if (resolvedPath) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const base = path.basename(resolvedPath, path.extname(resolvedPath));
    const outFile = path.join(OUTPUT_DIR, `${base}_visual_dom.json`);
    fs.writeFileSync(outFile, JSON.stringify(visualDOM, null, 2));
    visualDOM.saved_to = outFile;
  }

  return visualDOM;
}

app.post('/vision/process', async (req, res) => {
  const start = Date.now();
  try {
    const visualDOM = await buildVisualDOM(req.body);
    visualDOM.processing_ms = Date.now() - start;
    res.json(visualDOM);
  } catch (err) {
    console.error('[gateway] Pipeline error:', err.message);
    res.status(err.statusCode || 500).json({
      error: 'Vision pipeline failed',
      detail: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Full demo pipeline: URL -> visual DOM -> LLM test cases
// ---------------------------------------------------------------------------

app.post('/vision/generate-tests', async (req, res) => {
  const start = Date.now();
  try {
    const visualDOM = await buildVisualDOM(req.body);
    const { generateTestCases } = require('../src/testGenerator');
    const result = await generateTestCases(visualDOM);
    result.processing_ms = Date.now() - start;
    res.json(result);
  } catch (err) {
    console.error('[gateway] Test generation error:', err.message);
    res.status(err.statusCode || 500).json({
      error: 'Test generation failed',
      detail: err.message,
    });
  }
});

app.listen(PORT, () => console.log(`[gateway] Vision gateway running on :${PORT}`));

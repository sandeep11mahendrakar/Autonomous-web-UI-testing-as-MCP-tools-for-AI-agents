# Vision Architecture (Architecture B)

YOLO + OCR based UI understanding for automated web test case generation.

## Pipeline

```
URL
  |
  v
Playwright screenshot  (services/browser-service)
  |
  +--> YOLO detection   (services/yolo-service, Python + ultralytics)
  |        |
  |        v
  |    bounding boxes
  |
  +--> OCR text boxes   (services/ocr-service, Python + Tesseract)
           |
           v
       Merge into visual DOM  (services/merge-service)
           |
           v
       LLM generates JSON test cases  (src/llm.js -> Groq API)
           |
           v
       storage/outputs/test_cases_*.json
```

## Folder layout

```
vision/
├── gateway/          Express gateway orchestrating all services
├── services/
│   ├── browser-service/  Playwright screenshot capture (Node)
│   ├── yolo-service/     YOLOv8 object detection (Python)
│   ├── ocr-service/      Tesseract OCR word extraction (Python)
│   └── merge-service/    YOLO + OCR merge into visual DOM (Node)
├── src/
│   ├── llm.js            Vision-specific LLM client (Groq)
│   ├── visualDom.js      Prompt builder from visual DOM
│   └── testGenerator.js  Test case generation orchestration
│   └── executeTests.js   Coordinate-based test executor
├── runVision.js          One-shot demo entry point
├── package.json
├── .env.example
└── README.md
```

This folder is completely independent of Architecture A (`web/`).
Both can be demonstrated separately.

## Prerequisites

1. Node.js >= 18
2. Python 3.10+ with pip
3. Tesseract OCR installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`
   (or set `TESSERACT_CMD` in `.env`)
4. A valid `GROQ_API_KEY` in `.env`

## Setup

```bash
cd vision
npm install
pip install -r services/yolo-service/requirements.txt
pip install -r services/ocr-service/requirements.txt
copy .env.example .env
# edit .env and add your GROQ_API_KEY
```

## Run demo

```bash
node runVision.js https://demoqa.com
```

## Execute generated tests

Re-run saved test cases against their source URL without regenerating them
(no LLM call, no services needed):

```bash
cd vision
node src/executeTests.js storage/outputs/test_cases_<name>.json https://demoqa.com
# optional third arg: custom report path (default storage/outputs/execution_results.json)
```

Each test navigates to the base URL, executes its steps via coordinate-based
Playwright actions (`click`/`fill`/`navigate`), and verifies outcomes using
URL-change and body-text heuristics. A summary with per-test status,
failure reasons, executed steps and timings is written to
`storage/outputs/execution_results.json`.


Or start each service manually in separate terminals:

```bash
npm run start:browser
npm run start:yolo
npm run start:ocr
npm run start:merge
npm run start:gateway
```

Then POST to the gateway:

```bash
curl -X POST http://127.0.0.1:5000/vision/generate-tests ^
     -H "Content-Type: application/json" ^
     -d "{\"url\": \"https://demoqa.com\"}"
```

## Endpoints

| Endpoint                  | Method | Description                                  |
|---------------------------|--------|----------------------------------------------|
| `/vision/health`          | GET    | Health check for all downstream services     |
| `/vision/process`         | POST   | URL/image -> visual DOM only                 |
| `/vision/generate-tests`  | POST   | URL/image -> visual DOM -> LLM test cases    |

Body accepts `{ "url": "..." }`, `{ "image_path": "..." }`,
or `{ "image_b64": "..." }`.

## Notes on YOLO classes

YOLOv8n is trained on COCO. It does not have native "button" or "input" labels.
We map visually similar COCO objects (keyboard, cell phone, book, laptop,
tv, mouse) to approximate UI types. This is a documented limitation of the
current approach — the report acknowledges that YOLO provides bounding-box
geometry while OCR supplies semantic text.

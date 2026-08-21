"""UI element detection service (Architecture B).

Uses docling-project/ScreenParser (YOLO11-Large, trained on 1.45M web
screenshots, 55 semantic UI classes) to detect interactive web UI elements
from screenshots. Replaces the previous COCO YOLOv8n which could not detect
web UI elements.

Configuration via environment variables:
  YOLO_MODEL_PATH - path to model weights (default: docling-project/ScreenParser)
  YOLO_CONF      - confidence threshold (default: 0.15)
  YOLO_IMGSZ     - inference image size (default: 640)
"""

import base64
import os
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

import cv2
import numpy as np
from flask import Flask, jsonify, request
from ultralytics import YOLO

app = Flask(__name__)

MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "screenparser_best.pt"))
CONF_THRESHOLD = float(os.environ.get("YOLO_CONF", "0.15"))
IMGSZ = int(os.environ.get("YOLO_IMGSZ", "640"))

print(f"[yolo] Loading model: {MODEL_PATH} (conf={CONF_THRESHOLD}, imgsz={IMGSZ})")
model = YOLO(MODEL_PATH)
print(f"[yolo] Model loaded. Classes: {len(model.names)}")


def load_image(data):
    if data.get("image_path"):
        image_path = data["image_path"]
        if not os.path.exists(image_path):
            raise FileNotFoundError(image_path)
        return cv2.imread(image_path)
    if data.get("image_b64"):
        raw = base64.b64decode(data["image_b64"])
        buffer = np.frombuffer(raw, np.uint8)
        return cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    return None


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "yolo", "model": os.path.basename(MODEL_PATH)})


@app.route("/detect", methods=["POST"])
def detect():
    data = request.get_json(force=True) or {}
    try:
        img = load_image(data)
    except FileNotFoundError:
        return jsonify({"error": f"File not found: {data['image_path']}"}), 404

    if img is None:
        return jsonify({"error": "Provide a readable image via image_path or image_b64"}), 400

    start = time.time()
    results = model(img, conf=CONF_THRESHOLD, imgsz=IMGSZ, verbose=False)
    inference_ms = round((time.time() - start) * 1000)

    detections = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            label = model.names[class_id]
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = [round(v, 1) for v in box.xyxy[0].tolist()]
            detections.append(
                {
                    "class_id": class_id,
                    "label": label,
                    "type": label.lower().replace(" ", "_"),
                    "confidence": round(confidence, 3),
                    "bbox": [x1, y1, x2, y2],
                }
            )

    height, width = results[0].orig_shape[:2]
    return jsonify(
        {
            "count": len(detections),
            "detections": detections,
            "image_size": {"width": width, "height": height},
            "inference_ms": inference_ms,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("YOLO_SERVICE_PORT", "5001")), debug=False)




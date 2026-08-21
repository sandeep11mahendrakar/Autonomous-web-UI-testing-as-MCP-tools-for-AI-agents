"""YOLO detection service (Architecture B).

Loads yolov8n.pt and maps COCO classes to approximate UI element types.
Confidence threshold is configurable via YOLO_CONF (default 0.65 per report).
"""

import base64
import os

import cv2
import numpy as np
from flask import Flask, jsonify, request
from ultralytics import YOLO

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", os.path.join(BASE_DIR, "yolov8n.pt"))
CONF_THRESHOLD = float(os.environ.get("YOLO_CONF", "0.65"))

model = YOLO(MODEL_PATH)

# COCO classes that roughly correspond to on-screen UI shapes.
UI_CLASS_MAP = {
    56: "chair",
    57: "couch",
    59: "bed",
    60: "dining table",
    63: "laptop",
    64: "mouse",
    66: "keyboard",
    67: "cell phone",
    72: "tv",
    73: "book",
}

UI_TYPE_RULES = {
    "button": ("remote", "cell phone", "keyboard", "mouse"),
    "input": ("book", "laptop"),
    "image": ("tv", "monitor", "screen"),
}


def map_to_ui_type(label):
    lowered = label.lower()
    for ui_type, keywords in UI_TYPE_RULES.items():
        if any(keyword in lowered for keyword in keywords):
            return ui_type
    return "ui-element"


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
    return jsonify({"status": "ok", "service": "yolo"})


@app.route("/detect", methods=["POST"])
def detect():
    data = request.get_json(force=True) or {}
    try:
        img = load_image(data)
    except FileNotFoundError:
        return jsonify({"error": f"File not found: {data['image_path']}"}), 404

    if img is None:
        return jsonify({"error": "Provide a readable image via image_path or image_b64"}), 400

    results = model(img, conf=CONF_THRESHOLD, verbose=False)

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
                    "type": map_to_ui_type(label),
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
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("YOLO_SERVICE_PORT", "5001")), debug=False)

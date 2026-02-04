from flask import Flask, render_template, request, jsonify, url_for
import os, re, time, subprocess

app = Flask(__name__)

UPLOAD_FOLDER = "static/uploads"
COMPILER_PATH = "/home/arnaud/Desktop/arnaud/code/python/ImGoaTeX/ImGoaTeX-compilor.py"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --------------------------------------------------
# Utils
# --------------------------------------------------

def parse_media(file_path):
    with open(file_path, "r") as f:
        content = f.read()
    return re.findall(r'\\(image|video)\{(.+?)\}', content)


def compile_igtex(igtex_path):
    try:
        out = subprocess.check_output(
            ["python3", COMPILER_PATH, igtex_path],
            stderr=subprocess.STDOUT,
            text=True
        )
        print("COMPILER OK:\n", out)
        return True, out
    except subprocess.CalledProcessError as e:
        print("COMPILER ERROR:\n", e.output)
        return False, e.output


def get_upload_paths(folder):
    base = os.path.join(UPLOAD_FOLDER, folder)
    return {
        "base": base,
        "medias": os.path.join(base, "medias")
    }


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.route("/")
def index():
    return render_template("main.html")


# --------------------
# Upload .igtex
# --------------------
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if not file or not file.filename.endswith(".igtex"):
        return jsonify({"error": "Invalid .igtex file"}), 400

    folder = f"{file.filename[:-6]}_{int(time.time()*1e6)}"
    paths = get_upload_paths(folder)

    os.makedirs(paths["base"], exist_ok=True)
    os.makedirs(paths["medias"], exist_ok=True)

    igtex_path = os.path.join(paths["base"], file.filename)
    file.save(igtex_path)

    media = parse_media(igtex_path)

    return jsonify({
        "folder": folder,
        "media": media
    })


# --------------------
# Initial compile
# --------------------
@app.route("/upload_media/<folder>", methods=["POST"])
def upload_media(folder):
    paths = get_upload_paths(folder)

    if not os.path.exists(paths["base"]):
        return jsonify({"error": "Unknown folder"}), 400

    # save media files
    for f in request.files.values():
        f.save(os.path.join(paths["medias"], f.filename))

    igtex = next(f for f in os.listdir(paths["base"]) if f.endswith(".igtex"))
    igtex_path = os.path.join(paths["base"], igtex)

    # check missing media
    required = [name for _, name in parse_media(igtex_path)]
    uploaded = os.listdir(paths["medias"])
    missing = [m for m in required if m not in uploaded]

    if missing:
        return jsonify({"error": "Missing media files", "missing": missing}), 400

    ok, msg = compile_igtex(os.path.abspath(igtex_path))
    if not ok:
        return jsonify({"error": msg}), 500

    output_url = url_for("static", filename=f"uploads/{folder}/output.html")
    return jsonify({"success": True, "path": output_url})


# --------------------
# Compile edited source
# --------------------
@app.route("/compile_edit", methods=["POST"])
def compile_edit():
    folder = request.form.get("folder")
    filename = request.form.get("filename")
    source = request.form.get("source")

    if not all([folder, filename, source]):
        return jsonify({"error": "Missing fields"}), 400

    paths = get_upload_paths(folder)
    igtex_path = os.path.join(paths["base"], filename)

    if not os.path.exists(paths["base"]):
        return jsonify({"error": "Invalid folder"}), 400

    # overwrite source
    with open(igtex_path, "w") as f:
        f.write(source)

    # save media again (optional)
    for key, f in request.files.items():
        if key not in ("source", "filename"):
            f.save(os.path.join(paths["medias"], f.filename))

    # re-check media
    required = [name for _, name in parse_media(igtex_path)]
    uploaded = os.listdir(paths["medias"])
    missing = [m for m in required if m not in uploaded]

    if missing:
        return jsonify({"error": "Missing media files", "missing": missing}), 400

    ok, msg = compile_igtex(os.path.abspath(igtex_path))
    if not ok:
        return jsonify({"error": msg}), 500

    output_url = url_for("static", filename=f"uploads/{folder}/output.html")
    return jsonify({"success": True, "path": output_url})


# --------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)

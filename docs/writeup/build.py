"""Builds the submission write-up PDF from writeup.html.

    pip install qrcode pymupdf          # once
    python docs/writeup/build.py        # -> docs/writeup/out/Aangan-writeup.pdf (+ page previews)

The Nexconn App Key is read from the root .env (NEXCONN_APP_KEY). The demo video link comes
from AANGAN_VIDEO_URL (env var or .env). Everything in out/ and _build.html is git-ignored:
the rules ask teams not to post App Keys in public, so the PDF stays out of the repo.
"""

import io
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import qrcode
import qrcode.image.svg

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / "out"
APP_URL = "https://aangan-d550.onrender.com"
REPO_URL = "https://github.com/asmik417/Aangan"
BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
]


def read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    path = ROOT / ".env"
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return env


def qr_svg(url: str) -> str:
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=0, box_size=10)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode("utf-8")
    svg = re.sub(r"<\?xml[^>]*\?>", "", svg)
    return re.sub(r'\s(width|height)="[^"]*"', "", svg, count=2)


def find_browser() -> str:
    for b in BROWSERS:
        if os.path.isabs(b) and Path(b).exists():
            return b
        if not os.path.isabs(b) and shutil.which(b):
            return shutil.which(b)  # type: ignore[return-value]
    sys.exit("No Chrome or Edge found to print the PDF.")


def main() -> None:
    env = read_env()
    app_key = env.get("NEXCONN_APP_KEY", "")
    if not app_key:
        sys.exit("NEXCONN_APP_KEY is missing from .env")
    video = os.environ.get("AANGAN_VIDEO_URL") or env.get("AANGAN_VIDEO_URL", "")

    html = (HERE / "writeup.html").read_text(encoding="utf-8")
    if video:
        video_block = f'<div class="qr">{qr_svg(video)}</div>'
        video_label = re.sub(r"^https?://(www\.)?", "", video)[:42]
    else:
        video_block = '<div class="qr missing">Link added at submission</div>'
        video_label = "Linked on the submission page"
    html = (
        html.replace("{{APP_KEY}}", app_key)
        .replace("{{QR_APP}}", qr_svg(APP_URL))
        .replace("{{QR_REPO}}", qr_svg(REPO_URL))
        .replace("{{QR_VIDEO_BLOCK}}", video_block)
        .replace("{{VIDEO_LABEL}}", video_label)
        .replace("{{VIDEO_HREF}}", video or APP_URL + "/showcase")
    )
    left = re.findall(r"\{\{[A-Z_]+\}\}", html)
    if left:
        sys.exit(f"Unfilled placeholders: {sorted(set(left))}")

    build = HERE / "_build.html"  # next to shots/ so relative image paths work
    build.write_text(html, encoding="utf-8")
    OUT.mkdir(exist_ok=True)
    pdf = OUT / "Aangan-writeup.pdf"
    profile = OUT / ".browser-profile"
    cmd = [
        find_browser(), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        f"--user-data-dir={profile}", "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=20000", f"--print-to-pdf={pdf}", build.as_uri(),
    ]
    subprocess.run(cmd, check=True, timeout=180, capture_output=True)
    shutil.rmtree(profile, ignore_errors=True)
    print(f"PDF: {pdf} ({pdf.stat().st_size // 1024} KB)")

    try:
        import pymupdf
    except ImportError:
        return
    previews = OUT / "preview"
    shutil.rmtree(previews, ignore_errors=True)
    previews.mkdir()
    doc = pymupdf.open(pdf)
    for i, page in enumerate(doc, 1):
        page.get_pixmap(dpi=int(os.environ.get("PREVIEW_DPI", "80"))).save(previews / f"p{i:02d}.png")
    print(f"{doc.page_count} pages, previews in {previews}")


if __name__ == "__main__":
    main()

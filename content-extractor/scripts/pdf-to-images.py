#!/usr/bin/env python3
"""
PDF to Optimized PNG Image Converter
=====================================
Converts scanned PDF book pages to optimized PNG images for VLM processing.

Target: 150 DPI, max 512px dimension, RGB mode
Designed for: 8GB VRAM NVIDIA GPU, Windows 11

Usage:
    python pdf-to-images.py --input "books/physics-moaser.pdf" --output "temp/"
    python pdf-to-images.py --input "books/physics-moaser.pdf" --output "temp/" --dpi 150 --max-size 512
    python pdf-to-images.py --input "books/physics-moaser.pdf" --output "temp/" --start 1 --end 50
"""

import argparse
import os
import sys
import time
import json
from pathlib import Path

# Fix Windows console encoding issues for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

def load_pipeline_config() -> dict:
    """Load the pipeline configuration from pipeline-config.json."""
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config", "pipeline-config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Warning: Failed to load pipeline-config.json: {e}")
    return {}

try:
    import fitz  # PyMuPDF
except ImportError:
    print("❌ PyMuPDF not installed. Run: pip install PyMuPDF")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow not installed. Run: pip install Pillow")
    sys.exit(1)


def get_page_count(pdf_path: str) -> int:
    """Get total number of pages in PDF."""
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def convert_page_to_image(
    pdf_path: str,
    page_number: int,
    output_path: str,
    dpi: int = 150,
    max_size: int = 512,
    existing_pages: set = None,
    image_format: str = "PNG",
    optimize: bool = True
) -> dict:
    """
    Convert a single PDF page to an optimized image.

    Args:
        pdf_path: Path to the PDF file
        page_number: 0-based page index
        output_path: Directory to save the image
        dpi: Resolution for rendering (default: 150)
        max_size: Maximum dimension in pixels (default: 512)
        existing_pages: Set of already-processed page numbers to skip
        image_format: Image output format (PNG or JPEG)
        optimize: Apply image optimization

    Returns:
        dict with status, path, and metadata
    """
    ext = image_format.lower()
    page_label = f"page_{page_number + 1:04d}"
    image_path = os.path.join(output_path, f"{page_label}.{ext}")

    # Skip if already processed (resume capability)
    if existing_pages is not None and page_number in existing_pages:
        return {
            "status": "skipped",
            "page": page_number + 1,
            "path": image_path,
            "message": "Already exists"
        }

    try:
        doc = fitz.open(pdf_path)
        page = doc[page_number]

        # Render page at specified DPI
        # zoom factor: DPI / 72 (PDF default is 72 DPI)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        # Convert to PIL Image for resizing
        img_data = pix.tobytes("png")
        img = Image.open(__import__('io').BytesIO(img_data))

        # Ensure RGB mode
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if larger than max_size
        width, height = img.size
        if width > max_size or height > max_size:
            # Calculate new size maintaining aspect ratio
            ratio = min(max_size / width, max_size / height)
            new_width = int(width * ratio)
            new_height = int(height * ratio)
            img = img.resize((new_width, new_height), Image.LANCZOS)

        # Save optimized image
        img_format = "JPEG" if ext in ("jpg", "jpeg") else "PNG"
        img.save(image_path, img_format, optimize=optimize)

        # Get file size
        file_size = os.path.getsize(image_path)

        doc.close()

        return {
            "status": "success",
            "page": page_number + 1,
            "path": image_path,
            "width": img.size[0],
            "height": img.size[1],
            "dpi": dpi,
            "file_size_kb": round(file_size / 1024, 1)
        }

    except Exception as e:
        return {
            "status": "error",
            "page": page_number + 1,
            "path": image_path,
            "message": str(e)
        }


def get_existing_pages(output_dir: str, image_format: str = "PNG") -> set:
    """Check which pages already have images (for resume capability)."""
    existing = set()
    ext = image_format.lower()
    if os.path.exists(output_dir):
        for filename in os.listdir(output_dir):
            if filename.startswith("page_") and filename.endswith(f".{ext}"):
                try:
                    # Extract page number from filename like page_0045.ext
                    num = int(filename.replace("page_", "").replace(f".{ext}", ""))
                    existing.add(num - 1)  # Convert to 0-based
                except ValueError:
                    continue
    return existing


def main():
    parser = argparse.ArgumentParser(
        description="Convert PDF pages to optimized PNG images for VLM processing"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to the input PDF file"
    )
    config = load_pipeline_config()
    stage_config = config.get("stage_1_pdf_to_image", {})
    default_dpi = stage_config.get("dpi", 150)
    default_max_size = stage_config.get("max_size", 512)
    default_format = stage_config.get("image_format", "PNG")
    default_optimize = stage_config.get("optimize", True)

    parser.add_argument(
        "--output", "-o",
        default="temp/",
        help="Output directory for images (default: temp/)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=default_dpi,
        help=f"DPI for rendering (default: {default_dpi})"
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=default_max_size,
        help=f"Maximum image dimension in pixels (default: {default_max_size})"
    )
    parser.add_argument(
        "--format",
        type=str,
        default=default_format,
        help=f"Image output format (PNG/JPEG) (default: {default_format})"
    )
    parser.add_argument(
        "--optimize",
        type=bool,
        default=default_optimize,
        help=f"Optimize saved images (default: {default_optimize})"
    )
    parser.add_argument(
        "--start",
        type=int,
        default=None,
        help="Start page number (1-based, inclusive)"
    )
    parser.add_argument(
        "--end",
        type=int,
        default=None,
        help="End page number (1-based, inclusive)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process all pages even if they exist"
    )

    args = parser.parse_args()

    # Validate input
    if not os.path.exists(args.input):
        print(f"❌ PDF file not found: {args.input}")
        sys.exit(1)

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    # Get page count
    total_pages = get_page_count(args.input)
    print(f"📄 PDF: {args.input}")
    print(f"📊 Total pages: {total_pages}")

    # Determine page range
    start_page = (args.start - 1) if args.start else 0  # Convert to 0-based
    end_page = args.end if args.end else total_pages  # exclusive

    if start_page < 0:
        start_page = 0
    if end_page > total_pages:
        end_page = total_pages

    pages_to_process = end_page - start_page
    print(f"🎯 Processing pages {start_page + 1} to {end_page} ({pages_to_process} pages)")
    print(f"⚙️  DPI: {args.dpi} | Max size: {args.max_size}px | Format: {args.format}")

    # Get existing pages for resume
    existing_pages = set() if args.force else get_existing_pages(args.output, args.format)
    if existing_pages:
        print(f"📂 Found {len(existing_pages)} existing images (will skip unless --force)")

    # Process pages
    start_time = time.time()
    success_count = 0
    skip_count = 0
    error_count = 0

    for page_idx in range(start_page, end_page):
        page_num = page_idx + 1  # 1-based for display
        progress = f"[{page_num}/{total_pages}]"

        result = convert_page_to_image(
            pdf_path=args.input,
            page_number=page_idx,
            output_path=args.output,
            dpi=args.dpi,
            max_size=args.max_size,
            existing_pages=existing_pages,
            image_format=args.format,
            optimize=args.optimize
        )

        if result["status"] == "success":
            success_count += 1
            size_info = f"{result['width']}x{result['height']}px, {result['file_size_kb']}KB"
            print(f"  ✅ {progress} Converted ({size_info})")
        elif result["status"] == "skipped":
            skip_count += 1
            print(f"  ⏭️  {progress} Skipped (already exists)")
        elif result["status"] == "error":
            error_count += 1
            print(f"  ❌ {progress} Error: {result['message']}")

    # Summary
    elapsed = time.time() - start_time
    print(f"\n{'='*50}")
    print(f"🎉 Conversion complete!")
    print(f"   ✅ Success: {success_count}")
    print(f"   ⏭️  Skipped: {skip_count}")
    print(f"   ❌ Errors:  {error_count}")
    print(f"   ⏱️  Time:    {elapsed:.1f}s ({elapsed/pages_to_process:.1f}s/page)")
    print(f"   📁 Output:  {args.output}")

    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
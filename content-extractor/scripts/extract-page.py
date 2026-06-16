#!/usr/bin/env python3
"""
Single-Page VLM Content Extractor
===================================
Processes ONE page image at a time through a local Vision-Language Model (VLM)
via Ollama to extract structured educational content.

Safety Protocols (MANDATORY):
- ONE image per VLM request (never batch)
- 10-second cooldown between pages
- Immediate JSON save after each page
- GPU VRAM monitoring (pause if >7GB)
- Resume capability (skip existing JSONs)
- Graceful error handling (continue on failure)

Usage:
    python extract-page.py --input "temp/" --output "raw-json/" --model "qwen2-vl:7b"
    python extract-page.py --input "temp/" --output "raw-json/" --model "qwen2-vl:7b" --start 1 --end 50
    python extract-page.py --input "temp/" --output "raw-json/" --model "qwen2-vl:7b" --cooldown 15
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding issues for emoji printing
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

try:
    import ollama
except ImportError:
    print("❌ ollama package not installed. Run: pip install ollama")
    sys.exit(1)

try:
    import psutil
except ImportError:
    print("⚠️  psutil not installed (GPU monitoring disabled). Run: pip install psutil")
    psutil = None


# =============================================================================
# Constants & Configuration Loading
# =============================================================================

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

# Load centralized config
_config = load_pipeline_config()
_vlm_config = _config.get("stage_2_vlm_extraction", {})

ONE_IMAGE_PER_REQUEST = True  # NEVER change this
COOLDOWN_SECONDS = _vlm_config.get("cooldown_seconds", 10)
GPU_VRAM_LIMIT_MB = _vlm_config.get("vram_limit_mb", 7168)
GPU_CHECK_RETRIES = _vlm_config.get("gpu_check_retries", 3)
GPU_RETRY_WAIT = _vlm_config.get("gpu_retry_wait_seconds", 30)

# Build MODEL_CHAIN from config
_temp = _vlm_config.get("temperature", 0.1)
_predict = _vlm_config.get("max_tokens", 2048)
_ctx = _vlm_config.get("context_window", 4096)
_fallback_list = _vlm_config.get("fallback_chain", ["qwen2-vl:7b", "gemma3:4b", "qwen2-vl:2b"])

MODEL_CHAIN = {}
for m in _fallback_list:
    MODEL_CHAIN[m] = {"temperature": _temp, "num_predict": _predict, "num_ctx": _ctx}

if not MODEL_CHAIN:
    MODEL_CHAIN = {
        "qwen2-vl:7b": {"temperature": 0.1, "num_predict": 2048, "num_ctx": 4096},
        "gemma3:4b": {"temperature": 0.1, "num_predict": 2048, "num_ctx": 4096},
        "qwen2-vl:2b": {"temperature": 0.1, "num_predict": 2048, "num_ctx": 4096},
    }

_pref_model = _vlm_config.get("preferred_model", "qwen2-vl:7b")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPT_PATH = os.path.join(SCRIPT_DIR, "..", "config", "extraction-prompt.txt")


# =============================================================================
# GPU Monitoring
# =============================================================================

def get_gpu_vram_usage_mb() -> int:
    """
    Get current GPU VRAM usage in MB using nvidia-smi.
    Returns -1 if unable to determine.
    """
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            # Parse first GPU's memory usage
            lines = result.stdout.strip().split("\n")
            if lines:
                return int(lines[0].strip())
    except (subprocess.TimeoutExpired, FileNotFoundError, ValueError):
        pass

    # Fallback: try nvidia-ml-py3
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        pynvml.nvmlShutdown()
        return info.used // (1024 * 1024)
    except Exception:
        pass

    return -1


def wait_for_gpu_cool_down(max_vram_mb: int = GPU_VRAM_LIMIT_MB) -> bool:
    """
    Wait for GPU VRAM to drop below the limit.
    Returns True if GPU is ready, False if timed out.
    """
    for attempt in range(GPU_CHECK_RETRIES):
        vram = get_gpu_vram_usage_mb()
        if vram == -1:
            # Can't check GPU, assume it's okay
            return True

        if vram < max_vram_mb:
            return True

        print(f"  ⚠️  GPU VRAM high: {vram}MB/{max_vram_mb}MB. Waiting {GPU_RETRY_WAIT}s... (attempt {attempt + 1}/{GPU_CHECK_RETRIES})")
        time.sleep(GPU_RETRY_WAIT)

    # Final check
    vram = get_gpu_vram_usage_mb()
    if vram == -1 or vram < max_vram_mb:
        return True

    print(f"  ❌ GPU VRAM still high after {GPU_CHECK_RETRIES} retries ({vram}MB). Skipping this page.")
    return False


# =============================================================================
# Prompt Loading
# =============================================================================

def load_extraction_prompt() -> str:
    """Load the VLM extraction prompt from config file."""
    if os.path.exists(PROMPT_PATH):
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read().strip()

    # Fallback: inline prompt (same as extraction-prompt.txt)
    print(f"⚠️  Prompt file not found at {PROMPT_PATH}, using inline prompt")
    return """You are an expert Egyptian educational content extractor. Read this scanned textbook page and extract structured educational data in valid JSON format. Include: page_number, page_type, lesson_title, content_summary, definitions, formulas (in LaTeX), examples, exercises, tables, figures, key_points, raw_text (full Arabic text), and confidence score. Return ONLY valid JSON with no markdown formatting."""


# =============================================================================
# VLM Processing
# =============================================================================

def extract_content_from_page(
    image_path: str,
    prompt: str,
    model: str,
    page_number: int
) -> dict:
    """
    Send ONE image to Ollama VLM and get structured extraction.
    
    Args:
        image_path: Path to the page PNG image
        prompt: The extraction system prompt
        model: Ollama model name
        page_number: Page number (1-based) for metadata
        
    Returns:
        dict with extracted content or error info
    """
    try:
        # Verify image exists
        if not os.path.exists(image_path):
            return {
                "page_number": page_number,
                "status": "failed",
                "error": f"Image file not found: {image_path}",
                "timestamp": datetime.now().isoformat()
            }

        # Check GPU before request
        if not wait_for_gpu_cool_down():
            return {
                "page_number": page_number,
                "status": "failed",
                "error": "GPU VRAM too high, skipped",
                "timestamp": datetime.now().isoformat()
            }

        # SINGLE image per request - this is MANDATORY
        response = ollama.chat(
            model=model,
            messages=[{
                "role": "user",
                "content": prompt,
                "images": [image_path]  # ONE image only
            }],
            options={
                "temperature": MODEL_CHAIN.get(model, {}).get("temperature", 0.1),
                "num_predict": MODEL_CHAIN.get(model, {}).get("num_predict", 2048),
                "num_ctx": MODEL_CHAIN.get(model, {}).get("num_ctx", 4096),
            }
        )

        # Parse response
        raw_response = response["message"]["content"]

        # Try to extract JSON from response
        extracted = parse_vlm_json_response(raw_response, page_number)

        if extracted is not None:
            extracted["status"] = "success"
            extracted["model"] = model
            extracted["timestamp"] = datetime.now().isoformat()
            return extracted
        else:
            return {
                "page_number": page_number,
                "status": "failed",
                "error": "Could not parse JSON from VLM response",
                "raw_response": raw_response[:500],
                "model": model,
                "timestamp": datetime.now().isoformat()
            }

    except ollama.exceptions.OllamaError as e:
        error_msg = str(e)
        # Check for out-of-memory errors
        if "out of memory" in error_msg.lower() or "oom" in error_msg.lower():
            return {
                "page_number": page_number,
                "status": "failed",
                "error": f"OOM error - model {model} ran out of memory",
                "error_type": "oom",
                "model": model,
                "timestamp": datetime.now().isoformat()
            }
        return {
            "page_number": page_number,
            "status": "failed",
            "error": f"Ollama error: {error_msg}",
            "model": model,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "page_number": page_number,
            "status": "failed",
            "error": f"Unexpected error: {str(e)}",
            "model": model,
            "timestamp": datetime.now().isoformat()
        }


def parse_vlm_json_response(raw_response: str, page_number: int) -> dict | None:
    """
    Parse JSON from VLM response, handling various formats.
    The VLM might return JSON wrapped in markdown code blocks or with extra text.
    """
    # Try direct parse first
    try:
        data = json.loads(raw_response)
        data["page_number"] = page_number
        return data
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', raw_response, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            data["page_number"] = page_number
            return data
        except json.JSONDecodeError:
            pass

    # Try to find JSON object in the response
    brace_start = raw_response.find('{')
    brace_end = raw_response.rfind('}')
    if brace_start != -1 and brace_end > brace_start:
        try:
            json_str = raw_response[brace_start:brace_end + 1]
            data = json.loads(json_str)
            data["page_number"] = page_number
            return data
        except json.JSONDecodeError:
            pass

    return None


# =============================================================================
# Model Fallback Chain
# =============================================================================

def try_with_fallback(
    image_path: str,
    prompt: str,
    preferred_model: str,
    page_number: int
) -> dict:
    """
    Try extraction with model fallback chain:
    preferred_model -> gemma3:4b -> qwen2-vl:2b
    """
    # Build fallback chain
    models_to_try = [preferred_model]
    for fallback in MODEL_CHAIN.keys():
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    for model in models_to_try:
        result = extract_content_from_page(image_path, prompt, model, page_number)

        if result.get("status") == "success":
            return result

        # If OOM, try next model
        if result.get("error_type") == "oom":
            print(f"  ⚠️  Model {model} OOM, trying fallback...")
            continue

        # For other errors, return immediately
        return result

    # All models failed
    return {
        "page_number": page_number,
        "status": "failed",
        "error": "All models in fallback chain failed",
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# Resume & File Management
# =============================================================================

def get_existing_extractions(output_dir: str) -> set:
    """Get set of page numbers that already have extracted JSON."""
    existing = set()
    if os.path.exists(output_dir):
        for filename in os.listdir(output_dir):
            if filename.startswith("page_") and filename.endswith(".json"):
                try:
                    num = int(filename.replace("page_", "").replace(".json", ""))
                    existing.add(num)
                except ValueError:
                    continue
    return existing


def save_page_result(output_dir: str, page_number: int, result: dict) -> str:
    """
    Save extraction result to JSON file IMMEDIATELY.
    Returns the path where the file was saved.
    """
    os.makedirs(output_dir, exist_ok=True)
    filename = f"page_{page_number:04d}.json"
    filepath = os.path.join(output_dir, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return filepath


# =============================================================================
# Main Pipeline
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Extract structured content from page images using VLM"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Directory containing page PNG images"
    )
    parser.add_argument(
        "--output", "-o",
        default="raw-json/",
        help="Output directory for extracted JSON files (default: raw-json/)"
    )
    parser.add_argument(
        "--model", "-m",
        default=_pref_model,
        help=f"Ollama model to use (default: {_pref_model})"
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
        "--cooldown",
        type=int,
        default=COOLDOWN_SECONDS,
        help=f"Cooldown between pages in seconds (default: {COOLDOWN_SECONDS})"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process all pages even if JSON exists"
    )
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="Disable model fallback chain (use only specified model)"
    )

    args = parser.parse_args()

    # Validate input directory
    if not os.path.exists(args.input):
        print(f"❌ Input directory not found: {args.input}")
        sys.exit(1)

    # Create output directory
    os.makedirs(args.output, exist_ok=True)

    # Load extraction prompt
    prompt = load_extraction_prompt()
    print(f"📝 Loaded extraction prompt ({len(prompt)} chars)")

    # Find all page images
    image_files = sorted([
        f for f in os.listdir(args.input)
        if f.startswith("page_") and f.endswith(".png")
    ])

    if not image_files:
        print(f"❌ No page images found in {args.input}")
        sys.exit(1)

    # Determine page range
    all_page_numbers = []
    for f in image_files:
        try:
            num = int(f.replace("page_", "").replace(".png", ""))
            all_page_numbers.append(num)
        except ValueError:
            continue

    all_page_numbers.sort()

    if args.start is not None:
        all_page_numbers = [p for p in all_page_numbers if p >= args.start]
    if args.end is not None:
        all_page_numbers = [p for p in all_page_numbers if p <= args.end]

    if not all_page_numbers:
        print("❌ No pages in specified range")
        sys.exit(1)

    total = len(all_page_numbers)
    print(f"📄 Found {len(image_files)} images, processing {total} pages")
    print(f"🤖 Model: {args.model} | Cooldown: {args.cooldown}s")

    # Resume capability
    existing = set() if args.force else get_existing_extractions(args.output)
    if existing:
        print(f"📂 Found {len(existing)} existing extractions (will skip unless --force)")

    # Process pages
    start_time = time.time()
    success_count = 0
    skip_count = 0
    fail_count = 0
    errors = []

    for idx, page_num in enumerate(all_page_numbers):
        progress = f"[{idx + 1}/{total}]"
        image_path = os.path.join(args.input, f"page_{page_num:04d}.png")

        # Skip if already processed
        if not args.force and page_num in existing:
            skip_count += 1
            print(f"  ⏭️  {progress} Page {page_num} Skipped (already exists)")
            continue

        print(f"  🔍 {progress} Processing page {page_num}...")

        # Extract content
        if args.no_fallback:
            result = extract_content_from_page(image_path, prompt, args.model, page_num)
        else:
            result = try_with_fallback(image_path, prompt, args.model, page_num)

        # IMMEDIATE SAVE - never keep results only in memory
        filepath = save_page_result(args.output, page_num, result)

        if result.get("status") == "success":
            success_count += 1
            confidence = result.get("confidence", "N/A")
            page_type = result.get("page_type", "unknown")
            print(f"  ✅ {progress} Page {page_num} Saved (type={page_type}, confidence={confidence}) → {os.path.basename(filepath)}")
        else:
            fail_count += 1
            error_msg = result.get("error", "Unknown error")
            errors.append({"page": page_num, "error": error_msg})
            print(f"  ❌ {progress} Page {page_num} Failed: {error_msg}")
            print(f"       Saved error to {os.path.basename(filepath)}")

        # Mandatory cooldown between pages
        if idx < total - 1:  # Don't cooldown after the last page
            print(f"  ⏳ Cooldown {args.cooldown}s...")
            time.sleep(args.cooldown)

    # Save error summary if any failures
    if errors:
        errors_path = os.path.join(args.output, "errors.json")
        with open(errors_path, "w", encoding="utf-8") as f:
            json.dump({
                "total_errors": len(errors),
                "errors": errors,
                "timestamp": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

    # Summary
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"🎉 Extraction complete!")
    print(f"   ✅ Success: {success_count}/{total}")
    print(f"   ⏭️  Skipped: {skip_count}")
    print(f"   ❌ Failed:  {fail_count}")
    print(f"   ⏱️  Time:    {elapsed:.1f}s ({elapsed/max(total, 1):.1f}s/page)")
    print(f"   📁 Output:  {args.output}")
    if errors:
        print(f"   ⚠️  Errors saved to: {args.output}/errors.json")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
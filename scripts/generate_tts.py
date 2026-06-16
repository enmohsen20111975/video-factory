import asyncio
import argparse
import json
import os
import sys

try:
    import edge_tts
except ImportError:
    print("Error: edge-tts is not installed. Run 'pip install edge-tts' first.", file=sys.stderr)
    sys.exit(1)

async def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio and word-level timestamps JSON.")
    parser.add_argument("--text", type=str, required=True, help="Text to speak")
    parser.add_argument("--voice", type=str, default="ar-EG-SalmaNeural", help="TTS Voice (default: ar-EG-SalmaNeural)")
    parser.add_argument("--output-audio", type=str, required=True, help="Path to output MP3 file")
    parser.add_argument("--output-timestamps", type=str, required=True, help="Path to output JSON timestamps file")
    parser.add_argument("--rate", type=str, default="+0%", help="TTS speech rate (default: +0%)")
    parser.add_argument("--pitch", type=str, default="+0Hz", help="TTS speech pitch (default: +0Hz)")
    
    args = parser.parse_args()
    
    # Ensure output directories exist
    os.makedirs(os.path.dirname(os.path.abspath(args.output_audio)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(args.output_timestamps)), exist_ok=True)
    
    communicate = edge_tts.Communicate(args.text, args.voice, rate=args.rate, pitch=args.pitch, boundary="WordBoundary")
    word_boundaries = []
    
    print(f"Generating audio to {args.output_audio} and timestamps to {args.output_timestamps} using voice {args.voice}...")
    
    with open(args.output_audio, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Convert HNS (hundred-nanosecond units) to seconds
                # 1 second = 10,000,000 HNS
                offset_seconds = chunk["offset"] / 10000000.0
                duration_seconds = chunk["duration"] / 10000000.0
                end_seconds = offset_seconds + duration_seconds
                
                word_boundaries.append({
                    "word": chunk["text"],
                    "start": offset_seconds,
                    "end": end_seconds,
                    "duration": duration_seconds
                })
                
    # Save timestamps as JSON
    with open(args.output_timestamps, "w", encoding="utf-8") as json_file:
        json.dump(word_boundaries, json_file, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated. Total words: {len(word_boundaries)}")

if __name__ == "__main__":
    asyncio.run(main())

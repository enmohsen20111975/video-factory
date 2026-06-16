import asyncio
import edge_tts

async def test():
    communicate = edge_tts.Communicate("Hello world. This is a test.", "en-US-JennyNeural")
    submaker = edge_tts.SubMaker()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            pass
        elif chunk["type"] in ["WordBoundary", "SentenceBoundary"]:
            print(f"Feeding: {chunk['type']}, text: {chunk.get('text')}")
            submaker.feed(chunk)
            
    print("\nSRT output:")
    print(submaker.get_srt())

asyncio.run(test())

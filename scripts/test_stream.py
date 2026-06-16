import asyncio
import edge_tts

async def test():
    text = "Hello world"
    voice = "en-US-JennyNeural"
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")
    async for chunk in communicate.stream():
        print(f"Chunk type: {chunk.get('type')}, keys: {list(chunk.keys())}")
        if chunk.get('type') == 'WordBoundary':
            print(f"  WordBoundary: {chunk}")

asyncio.run(test())

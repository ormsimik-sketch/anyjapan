"""Speakly AI - FastAPI backend.

Endpoints:
  GET  /                  health check
  GET  /api/scenarios     list practice scenarios
  POST /api/transcribe    audio -> text (Whisper)
  POST /api/chat          conversation turn -> AI reply + correction
  POST /api/tts           text -> speech (mp3)
  POST /api/results       analyze conversation -> score + mistakes
  GET  /api/level/{id}    fetch a user's tracked level (Supabase)
"""
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import openai_service
import supabase_service
from config import settings
from prompts import SCENARIOS
from schemas import (
    ChatRequest,
    ChatResponse,
    ResultsRequest,
    ResultsResponse,
    TranscribeResponse,
    TTSRequest,
)

app = FastAPI(title="Speakly AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Speakly AI",
        "supabase": settings.supabase_enabled,
    }


@app.get("/api/scenarios")
def list_scenarios():
    return {
        "scenarios": [
            {
                "id": s["id"],
                "title": s["title"],
                "emoji": s["emoji"],
                "description": s["description"],
                "opener": s["opener"],
            }
            for s in SCENARIOS.values()
        ]
    }


@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
    try:
        text = openai_service.transcribe(audio_bytes, file.filename or "audio.m4a")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")
    return TranscribeResponse(text=text)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    try:
        return openai_service.chat(req.scenario, req.level, req.messages)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Chat failed: {exc}")


@app.post("/api/tts")
def tts(req: TTSRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")
    try:
        audio = openai_service.text_to_speech(req.text, req.voice)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}")
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/results", response_model=ResultsResponse)
def results(req: ResultsRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    try:
        result = openai_service.assess(req.scenario, req.level, req.messages)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Assessment failed: {exc}")

    # Best-effort persistence (no-op if Supabase isn't configured).
    supabase_service.save_session(
        user_id=req.user_id,
        scenario=req.scenario,
        level=req.level,
        score=result.score,
        level_estimate=result.level_estimate,
        summary=result.summary,
        mistakes=[m.model_dump() for m in result.mistakes],
        messages=[m.model_dump() for m in req.messages],
    )
    return result


@app.get("/api/level/{user_id}")
def get_level(user_id: str):
    level = supabase_service.get_user_level(user_id)
    return {"user_id": user_id, "level": level}

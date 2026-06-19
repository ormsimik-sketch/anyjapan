"""Thin wrapper around the OpenAI API: chat, transcription, TTS, assessment."""
import json
from typing import Optional

from openai import OpenAI

from config import settings
from prompts import (
    RESULTS_SYSTEM_PROMPT,
    build_system_prompt,
)
from schemas import ChatResponse, Message, ResultsResponse

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def _messages_to_openai(messages: list[Message]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in messages]


def chat(scenario: str, level: str, messages: list[Message]) -> ChatResponse:
    """Generate the AI character's reply + an optional correction."""
    system_prompt = build_system_prompt(scenario, level)
    payload = [{"role": "system", "content": system_prompt}] + _messages_to_openai(messages)

    completion = client.chat.completions.create(
        model=settings.CHAT_MODEL,
        messages=payload,
        temperature=0.8,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    data = json.loads(raw)

    correction = data.get("correction")
    if isinstance(correction, str) and not correction.strip():
        correction = None

    return ChatResponse(
        reply=data.get("reply", "").strip() or "Sorry, could you say that again?",
        correction=correction,
        has_mistake=bool(data.get("has_mistake")) and correction is not None,
    )


def transcribe(audio_bytes: bytes, filename: str) -> str:
    """Speech-to-text using Whisper."""
    result = client.audio.transcriptions.create(
        model=settings.WHISPER_MODEL,
        file=(filename, audio_bytes),
        language="en",
    )
    return result.text.strip()


def text_to_speech(text: str, voice: Optional[str] = None) -> bytes:
    """Text-to-speech using OpenAI TTS. Returns MP3 bytes."""
    response = client.audio.speech.create(
        model=settings.TTS_MODEL,
        voice=voice or settings.TTS_VOICE,
        input=text,
    )
    return response.read()


def assess(scenario: str, level: str, messages: list[Message]) -> ResultsResponse:
    """Analyze the conversation and return mistakes, corrections and a score."""
    transcript_lines = []
    for m in messages:
        speaker = "USER" if m.role == "user" else "COACH"
        transcript_lines.append(f"{speaker}: {m.content}")
    transcript = "\n".join(transcript_lines)

    completion = client.chat.completions.create(
        model=settings.CHAT_MODEL,
        messages=[
            {"role": "system", "content": RESULTS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Scenario: {scenario}. Stated level: {level}.\n\n"
                    f"Transcript:\n{transcript}"
                ),
            },
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    data = json.loads(completion.choices[0].message.content or "{}")

    score = int(data.get("score", 0))
    score = max(0, min(100, score))

    return ResultsResponse(
        score=score,
        level_estimate=data.get("level_estimate", level),
        summary=data.get("summary", "Great effort! Keep practicing."),
        mistakes=data.get("mistakes", []),
    )

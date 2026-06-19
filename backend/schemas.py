"""Pydantic request/response models for the Speakly AI API."""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    scenario: str = Field(default="daily_life")
    level: str = Field(default="A2")
    messages: list[Message] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    correction: Optional[str] = None
    has_mistake: bool = False


class TranscribeResponse(BaseModel):
    text: str


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None


class ResultsRequest(BaseModel):
    scenario: str = Field(default="daily_life")
    level: str = Field(default="A2")
    messages: list[Message] = Field(default_factory=list)
    user_id: Optional[str] = None


class Mistake(BaseModel):
    original: str
    corrected: str
    explanation: str


class ResultsResponse(BaseModel):
    score: int
    level_estimate: str
    summary: str
    mistakes: list[Mistake] = Field(default_factory=list)

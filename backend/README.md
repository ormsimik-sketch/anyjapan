# Speakly AI — Backend (FastAPI)

AI English-speaking-practice API. Wraps OpenAI Chat (GPT-4.1), Whisper
(speech-to-text) and TTS, with optional Supabase persistence.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in OPENAI_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs for interactive API docs.

> Supabase is **optional**. The app runs fully without it — set
> `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` only if you want to persist
> sessions and track user levels. Schema lives in `supabase_schema.sql`.

## Endpoints

| Method | Path                | Purpose                                  |
| ------ | ------------------- | ---------------------------------------- |
| GET    | `/`                 | Health check                             |
| GET    | `/api/scenarios`    | List practice scenarios                  |
| POST   | `/api/transcribe`   | Audio file → text (Whisper)              |
| POST   | `/api/chat`         | Conversation turn → reply + correction   |
| POST   | `/api/tts`          | Text → speech (mp3)                      |
| POST   | `/api/results`      | Analyze conversation → score + mistakes  |
| GET    | `/api/level/{id}`   | Fetch a user's tracked level             |

### `POST /api/chat`

```json
{
  "scenario": "cafe",
  "level": "A2",
  "messages": [
    { "role": "assistant", "content": "Hi! What can I get you?" },
    { "role": "user", "content": "I want a coffee please" }
  ]
}
```

Returns:

```json
{ "reply": "Sure! Hot or iced?", "correction": null, "has_mistake": false }
```

## Models

Configurable via `.env`: `CHAT_MODEL` (default `gpt-4.1`),
`WHISPER_MODEL` (`whisper-1`), `TTS_MODEL` (`tts-1`), `TTS_VOICE` (`alloy`).

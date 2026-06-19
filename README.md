# 🎙️ Speakly AI

An AI-powered English **speaking** practice app. Have real voice conversations
with an AI that plays a character (barista, traveler, interviewer, friend),
gets your mistakes corrected after each reply, and receive a score at the end.

## Tech stack
- **Mobile:** React Native (Expo) — `mobile/`
- **Backend:** FastAPI (Python) — `backend/`
- **Database:** Supabase (optional) — `backend/supabase_schema.sql`
- **AI:** OpenAI GPT-4.1 (chat) · Whisper (speech-to-text) · TTS (text-to-speech)

## Core features
1. 🎤 Voice conversation with the AI (speak, it speaks back)
2. 🎭 Real-life scenarios: café, travel, job interview, daily talk
3. 🧑 AI acts like a real person for each scenario
4. ✍️ Mistakes corrected **after** the reply
5. 📊 Results screen: score, estimated level, corrections
6. 📈 Level tracking (A1, A2, B1) — persisted when Supabase is configured

## Architecture

```
Phone (Expo)
  ├─ record voice ──▶ POST /api/transcribe  (Whisper)   ──▶ text
  ├─ text+history ─▶ POST /api/chat         (GPT-4.1)    ──▶ reply + correction
  ├─ reply ───────▶ POST /api/tts           (OpenAI TTS) ──▶ spoken audio
  └─ on finish ───▶ POST /api/results       (GPT-4.1)    ──▶ score + mistakes
                                                              └▶ Supabase (optional)
```

## Quick start

**1. Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add your OPENAI_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**2. Mobile**
```bash
cd mobile
npm install
npm start
```
Set `expo.extra.apiUrl` in `mobile/app.json` to your backend URL
(use your LAN IP when running on a physical phone), then open in Expo Go.

See `backend/README.md` and `mobile/README.md` for details.

## AI behavior
The coach follows a fixed system prompt (see `backend/prompts.py`): always in
character, replies in 1–3 simple sentences at the user's level, corrects
mistakes only **after** replying, and keeps the conversation going with
questions.

> **MVP focus:** a working voice conversation loop over polished design.

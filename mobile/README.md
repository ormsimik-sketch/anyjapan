# Speakly AI — Mobile (Expo / React Native)

The Speakly AI app: voice conversations with an AI English coach.

## Screens
- **Home** — pick your level (A1/A2/B1) and tap **Start Speaking**
- **Scenarios** — choose café, travel, job interview, or daily life
- **Chat** — tap the mic, speak, the AI replies (with voice) and corrects you
- **Results** — score, estimated level, and a list of corrections

## Setup

```bash
cd mobile
npm install
npm start          # then press i (iOS), a (Android), or scan the QR in Expo Go
```

## Point the app at your backend

The API base URL lives in `app.json` → `expo.extra.apiUrl`
(read in `src/config.ts`). On a simulator `http://localhost:8000` works.
On a **physical phone**, use your computer's LAN IP, e.g.:

```json
"extra": { "apiUrl": "http://192.168.1.20:8000" }
```

Make sure the FastAPI backend (see `../backend`) is running first.

## How voice works
1. `expo-av` records your speech to an `.m4a` file.
2. The file is uploaded to `POST /api/transcribe` (Whisper) → text.
3. Text + history go to `POST /api/chat` → AI reply + correction.
4. The reply is sent to `POST /api/tts` and played back as audio.
5. **Finish** sends the transcript to `POST /api/results` for scoring.

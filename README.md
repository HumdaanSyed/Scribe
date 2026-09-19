# Scribe

A local demo app for live meeting transcription. Record from your microphone, a Chrome tab, or both, and watch a speaker-labelled transcript appear in real time. Afterwards, summarize the meeting, ask questions about it, rename speakers, and export a PDF.

Runs on `localhost` only. There is no deployment, auth, or sharing.

## Features

- **Live transcription** with speaker diarization (Deepgram Nova-3), from the microphone, Chrome tab audio, or both mixed together
- **Pause / resume** into the same transcript, with a marked boundary if the connection drops and reconnects
- **Speaker renaming** — rename once and every turn updates
- **AI summary** — structured notes (overview, key points, decisions, action items), streamed from Claude
- **Transcript Q&A** — chat about the meeting; answers come only from the transcript
- **PDF export** — transcript only, or transcript plus summary, with optional timestamps
- **Meeting history** — every meeting is saved in your browser (IndexedDB) and can be reopened

## Requirements

- Node.js and npm
- **Google Chrome on macOS** (other browsers are not supported)
- A [Deepgram](https://console.deepgram.com) API key
- An [Anthropic](https://console.anthropic.com) API key

The Deepgram key needs the **Member** role or higher. A key with less access is rejected when the app requests a temporary token.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```
DEEPGRAM_API_KEY=your-deepgram-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Then start the dev server and open <http://localhost:3000>:

```bash
npm run dev
```

Both keys stay on the server. The browser only ever receives a short-lived Deepgram token from `/api/deepgram/token`, and Claude requests go through `/api/summarize` and `/api/chat`.

## Using it

1. Click **New meeting**, choose your sources (**Microphone**, **System audio**, or both), and press **Record**. Allow microphone access when Chrome asks.
2. Speak. Text appears within about a second, grouped by speaker.
3. **Pause** and **Resume** as needed, then press **Stop**. The meeting is saved automatically and switches to review.
4. Use the **Summary**, **Ask**, and **Speakers** tabs, and **Export** for a PDF.

### Capturing audio from a tab

Enable **System audio**, and in Chrome's picker choose the **Chrome Tab** tab, select the tab, and turn on **Share tab audio**. Chrome on macOS cannot capture system-wide audio, so audio from native desktop apps isn't available without a virtual audio device.

## Known limitations

- Chrome only, on macOS. Safari does not support tab audio capture.
- Diarization is Deepgram's and isn't perfect. Overlapping speech and very short interjections can be misattributed; renaming speakers is the workaround.
- A dropped connection loses the audio during the gap. The transcript so far is kept and the reconnect is marked in the transcript.
- Single user, single machine. Meetings live in this browser's IndexedDB, so clearing site data deletes them.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Stack

Next.js (App Router) and TypeScript, Tailwind CSS v4, Deepgram streaming API, Anthropic Claude API, Web Audio API with an AudioWorklet, IndexedDB via `idb`, and `@react-pdf/renderer`.

<div align="center">

# **MeetingProxy**

### Your AI-Powered Digital Twin for Google Meet

*Attend meetings. Listen intelligently. Respond naturally.*

</div>
<div align="center">
*Attends meetings. Listens, thinks, and speaks back — so you don't have to be there.*

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![OpenAI](https://img.shields.io/badge/GPT--4o--mini-Reasoning-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

[Demo](#-demo) · [Features](#-features) · [Architecture](#-architecture) · [Tech Stack](#-tech-stack) · [Setup](#-getting-started) · [MCP Server](#-mcp-server-integration)

</div>
</div>
---


## 🎥 Demo

<p align="center">
  <a href="https://youtu.be/uFs-ezIrIic">
    <img src="docs/demo.gif" width="900" alt="MeetingProxy Demo">
  </a>
</p>

<p align="center">
Click the preview above to watch the full demo.
</p>

---

##  What is MeetingProxy?

**MeetingProxy** is an autonomous AI agent that joins Google Meet sessions on your behalf. It listens to the conversation in real time, understands context using an LLM, and responds naturally through a lip-synced digital avatar with a cloned voice — effectively acting as a **digital twin** in meetings you can't attend.
it is basically a fully functional server or plateform which enables the user to achive or make a digital clone with no effort. and it self joins the meeting and itself adjust the mic and camra settings
Built as a Final Year Project, MeetingProxy explores the intersection of **conversational AI, real-time audio/video pipelines, and browser automation**.

---

##  Features

| Feature | Description |
|---|---|
|  **Autonomous Meeting Join** | Selenium-driven bot joins Google Meet calls without manual intervention |
|  **Real-Time Transcription** | OpenAI Whisper converts live meeting audio to text on the fly |
|  **Context-Aware Responses** | GPT-4o-mini generates relevant, natural replies based on conversation context |
|  **Voice Cloning** | ElevenLabs synthesizes responses in a natural, human-like voice |
|  **Lip-Synced Avatar** | D-ID API animates a digital avatar to match generated speech |
|  **Virtual Audio Routing** | VB-Audio Cable pipes AI-generated audio directly into the meeting |
|  **Session Recording** | OBS Studio captures and manages the avatar's live video feed |
|  **Secure Auth & Storage** | Firebase handles authentication; Cloudinary manages media assets |
|  **MCP Server Support** | Exposes MeetingProxy's core functions as tools via a FastMCP server |

---

##  Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌───────────────────┐
│   React (Vite)   │◄────►│   Flask Backend   │◄────►│   Google Meet      │
│   Frontend UI    │      │   (Orchestrator)  │      │   (via Selenium)   │
└─────────────────┘      └─────────┬─────────┘      └───────────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                       ▼
     ┌───────────────┐     ┌────────────────┐      ┌────────────────┐
     │ Whisper (STT)  │     │ GPT-4o-mini    │      │ ElevenLabs (TTS)│
     │ Transcription  │     │ Reasoning Layer│      │ Voice Synthesis │
     └───────────────┘     └────────────────┘      └───────┬────────┘
                                                             ▼
                                                     ┌────────────────┐
                                                     │  D-ID Avatar   │
                                                     │  Lip Sync Video│
                                                     └───────┬────────┘
                                                             ▼
                                              ┌──────────────────────────┐
                                              │ OBS Studio + VB-Cable    │
                                              │ → Streamed into Meet call │
                                              └──────────────────────────┘
```

*Full diagrams available in `/docs/architecture` (draw.io source included).*

---

##  Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Custom Dark UI (Orange Accent Theme) |
| **Backend** | Flask, Python |
| **AI / ML** | GPT-4o-mini, OpenAI Whisper, ElevenLabs, D-ID API |
| **Automation** | Selenium, OBS Studio, VB-Audio Cable |
| **Infra** | Firebase (Auth + Firestore), Cloudinary (Media) |
| **Protocol** | FastMCP (MCP Server Extension) |

</div>

---

##  Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- OBS Studio installed with WebSocket plugin enabled
- VB-Audio Virtual Cable installed
- API keys: OpenAI, ElevenLabs, D-ID, Firebase config

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mfaaizi/MeetingProxy.git
cd MeetingProxy

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Frontend setup
cd ../frontend
npm install

# 4. Environment variables
cp .env.example .env
# Fill in: OPENAI_API_KEY, ELEVENLABS_API_KEY, DID_API_KEY, FIREBASE_CONFIG

# 5. Run the app
# Terminal 1 (backend)
cd backend && python app.py

# Terminal 2 (frontend)
cd frontend && npm run dev
```

The app will be available at `http://localhost:5173`.

---

##  MCP Server Integration

MeetingProxy exposes its core capabilities (join meeting, get transcript, trigger avatar response) as callable tools via a **FastMCP** server — allowing any MCP-compatible client (like Claude) to control a meeting session programmatically.

```bash
cd mcp-server
pip install -r requirements.txt
python server.py
```

See [`/mcp-server/README.md`](./mcp-server/README.md) for the full tool schema.

---

##  Project Structure

```
MeetingProxy/
├── frontend/          # React + Vite UI (18 page components)
├── backend/           # Flask API + orchestration logic
├── mcp-server/         # FastMCP server exposing MeetingProxy as tools
├── docs/              # FYP documentation, diagrams, test cases
└── README.md
```

---

##  Roadmap

- [ ] Multi-platform support (Zoom, MS Teams)
- [ ] Multi-language transcription & response
- [ ] Persistent memory across recurring meetings
- [ ] Meeting summary auto-generation & email digest

---

##  Author

**Muhammad Faaizi**
BS Artificial Intelligence · 2022–2026

📌 Focused on Agentic AI, MCP Servers, and Applied ML Systems

[GitHub](https://github.com/mfaaizi) · [LinkedIn](www.linkedin.com/in/faaizi)

---

<div align="center">

*If this project interests you, consider leaving a ⭐ — it helps a lot.*

</div>

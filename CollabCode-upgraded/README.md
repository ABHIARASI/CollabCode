# CollabCode — upgraded starter

This is a cleaned-up implementation scaffold based on the uploaded original project.

## Stack
- Frontend: Vite + React + Monaco Editor + Socket.IO client
- Backend: Node.js, Express, Socket.IO, PostgreSQL, JWT, bcrypt
- AI: Gemini API called only from the backend

## Setup
1. Install Node.js 20+ and PostgreSQL.
2. Create a PostgreSQL database, e.g. `collabcode`.
3. Copy `backend/.env.example` to `backend/.env` and fill in values.
4. In a terminal:
   ```bash
   cd backend
   npm install
   npm run db:init
   npm run dev
   ```
5. In another terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Open the Vite URL shown in the terminal.

## Security notes
- Never commit `.env`.
- The API uses password hashing and JWT authentication.
- Room membership is checked server-side.
- Do not expose the Gemini key in frontend code.
- Code execution requires Docker Desktop / Docker Engine. The backend runs each program in a temporary container with networking disabled, read-only source mount, memory/CPU/PID limits, dropped Linux capabilities, and a 10-second timeout. The first run of each language may download its Docker image. Never expose the Docker socket or this service to untrusted public traffic without additional operational hardening.

## Current implementation status
Included: registration/login, authenticated REST APIs, room creation/joining, Yjs collaborative editing, live collaborator cursors/selections, saved code/chat in PostgreSQL, Socket.IO collaboration events, Gemini-backed AI assistance, and Docker-based sandboxed execution for C, C++, Java, Python, JavaScript, Go, and Rust.

The editor uses Yjs with a Monaco binding for concurrent editing. Live cursor/selection awareness is relayed through authenticated, room-scoped Socket.IO events. Verify behavior with multiple users after changes.

## Code execution notes
- Install and start Docker Desktop before using Run Code.
- Execution requires pulling the language images on first use (gcc:14, eclipse-temurin:21-jdk, python:3.12-alpine, node:22-alpine, golang:1.23-alpine, rust:1.83-alpine).
- The sandbox has no network access and limits memory to 128 MB, CPU to 0.5 cores, PIDs to 64, and runtime to 10 seconds. Output is capped.
- This is a local development baseline, not a guarantee of production-grade isolation. For public deployment, use a dedicated runner service/VM, patch Docker and images, add queueing and stronger tenant controls, and avoid running the API with unnecessary host privileges.
- TypeScript is listed in the editor language menu but isn't enabled in the runner yet; choose JavaScript for runnable Node.js code.

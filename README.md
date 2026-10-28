# CollabCode — Real-Time Collaborative Coding Platform

CollabCode is a full-stack collaborative coding platform that allows developers and students to write, edit, share, and execute code together in real time.

It combines collaborative code editing, private coding rooms, real-time communication, AI-powered coding assistance, and Docker-based code execution in a single workspace.

The platform is designed for Data Structures and Algorithms (DSA) practice, coding interview preparation, pair programming, and collaborative debugging.

## Features

### 1. Real-Time Collaborative Editing
- Multiple users can edit the same code document simultaneously.
- Uses Yjs to synchronize concurrent changes.
- Monaco Editor provides a familiar, VS Code-like coding experience.
- Socket.IO facilitates real-time communication between clients and the backend.

### 2. Private Coding Rooms
- Create a coding room and invite collaborators using a room ID.
- Join existing rooms with the appropriate access.
- Server-side membership validation protects room operations.

### 3. Live Collaboration
- Synchronize code changes between connected collaborators.
- Support live collaborator cursor and selection indicators.
- Make pair programming and collaborative debugging easier.

### 4. AI-Powered Coding Assistant
- Integrated with Google's Gemini API.
- Send code and coding-related tasks to the AI assistant.
- Receive AI-generated assistance directly in the workspace.

### 5. Docker-Based Code Execution
- Execute programs in Docker containers.
- Use isolated execution environments with resource restrictions.
- Apply execution timeouts and output limits.
- Designed to support multiple programming languages.

### 6. Persistent Coding Sessions
- PostgreSQL stores application data.
- Save code and language selections.
- Persist collaborative document state.
- Store room chat messages for later retrieval.

### 7. Authentication and Security
- User registration and login.
- JWT-based authentication.
- Password hashing using bcrypt.
- Request validation and API rate limiting.
- Security headers using Helmet.
- Backend authorization checks for room access.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, CSS |
| Code Editor | Monaco Editor |
| Backend | Node.js, Express.js |
| Real-Time Communication | Socket.IO |
| Collaborative Editing | Yjs, y-monaco |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt |
| AI Integration | Google Gemini API |
| Code Execution | Docker |
| Version Control | Git, GitHub |

## Architecture

```text
                 COLLABCODE
                      |
          +-----------+-----------+
          |                       |
     React Frontend          React Frontend
       User A                   User B
          |                       |
          +-----------+-----------+
                      |
               Socket.IO / REST
                      |
             Node.js + Express
                      |
       +--------------+--------------+
       |              |              |
   PostgreSQL       Gemini API    Docker
   Persistence      AI Help       Execution
```

## How It Works

### Collaborative Editing

1. A user creates or joins a coding room.
2. The frontend initializes the shared code editor.
3. Yjs manages document changes and concurrent edits.
4. Socket.IO communicates updates between connected clients.
5. The backend persists the collaborative document state.

### AI Assistance

1. The user selects a coding task.
2. The frontend sends the source code, programming language, and task to the backend.
3. The backend calls the Gemini API.
4. The AI response is returned to the frontend.

### Code Execution

1. The user selects a programming language and writes code.
2. The frontend submits the code to the backend.
3. The backend validates the request and room access.
4. Docker executes the program in a language-specific container.
5. The execution output or error is returned to the user.

## Supported Programming Languages

The execution configuration is intended to support:

- C
- C++
- Java
- Python
- JavaScript
- Go
- Rust

TypeScript may be available in the editor, but execution support is not currently enabled.

**Note:** Execution support and reliability must be verified for each language in the current development environment.

## Prerequisites

Before running CollabCode locally, install:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git
- A Google Gemini API key for AI assistance

Ensure Docker Desktop is running before testing code execution.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ABHIARASI/CollabCode.git
cd CollabCode
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory.

Configure the environment variables required by the backend, including:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`
- `GEMINI_API_KEY`

Use the exact variable names expected by your backend configuration. Set the database connection string, frontend origin, and API key to match your local environment.

Generate a strong, random JWT secret of at least 32 characters.

**Never commit your `.env` file or expose your API keys.**

Start the backend using the script configured in `backend/package.json`. For example, if the project defines a `dev` script:

```bash
npm run dev
```

### 3. Configure the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

Adjust the URL if your backend uses a different address or port.

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal, usually:

http://localhost:5173

### 4. Configure PostgreSQL

Ensure PostgreSQL is running and the configured database exists.

Run the project's database initialization process as required by the backend setup.

Confirm that the backend connects successfully before creating a coding room.

### 5. Configure Docker

Ensure Docker Desktop is running.

Pull the language images required by the execution configuration before testing the corresponding language. For example:

```bash
docker pull python:3.12-alpine
docker pull eclipse-temurin:21-jdk
```

The Python and Java images above are used for Python and Java execution, respectively.

## Environment Variables

Keep configuration and secrets in local environment files.

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used for JWT signing |
| `FRONTEND_ORIGIN` | Allowed frontend origin or origins |
| `GEMINI_API_KEY` | API key for Gemini integration |
| `VITE_API_URL` | Backend API URL used by the frontend |

Check the backend source code for the exact required variables and defaults.

Do not publish credentials, API keys, database passwords, or JWT secrets.

## Project Structure

```text
CollabCode/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── init-db.js
│   │   └── validation.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src.jsx
│   ├── style.css
│   ├── index.html
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```

*The frontend and backend filenames shown above are illustrative; use the actual filenames in your repository.*

## Security Considerations

CollabCode incorporates authentication, authorization, request validation, and restricted Docker execution.

The execution environment is intended to use resource limits, restricted networking, and filesystem protections.

However, containerization alone does not guarantee complete isolation. Additional hardening, monitoring, and security testing are necessary before running untrusted code in a public production environment.

## Future Improvements

- Improve code execution reliability across all supported languages.
- Add automated tests for authentication, room access, and collaboration.
- Improve AI error handling and response reliability.
- Add stronger execution isolation and abuse prevention.
- Improve the user interface and mobile responsiveness.
- Add collaborative session management and additional developer tools.
- Deploy the frontend and backend for public access.

## Use Cases

- Collaborative DSA practice.
- Coding interview preparation.
- Pair programming.
- Mentor-led coding sessions.
- Real-time debugging.
- Learning programming with friends.

## Author

**Abhi Arasi A**

GitHub: [@ABHIARASI](https://github.com/ABHIARASI)

## License

A license has not yet been specified. Add a `LICENSE` file before distributing the project under a particular open-source license.

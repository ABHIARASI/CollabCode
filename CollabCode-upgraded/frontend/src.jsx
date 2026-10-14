import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import './style.css';


const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getToken = () => localStorage.getItem('collabcode_token');
const saveAuth = (data) => { localStorage.setItem('collabcode_token', data.token); localStorage.setItem('collabcode_user', JSON.stringify(data.user)); };
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('collabcode_user')); } catch { return null; } });
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [roomId, setRoomId] = useState(new URLSearchParams(location.search).get('room') || '');
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('// Welcome to CollabCode\n// Solve a DSA problem together!\n');
  const [language, setLanguage] = useState('cpp');
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [aiTask, setAiTask] = useState('explain');
  const [aiAnswer, setAiAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [runInput, setRunInput] = useState('');
  const [runOutput, setRunOutput] = useState('');
  const [runStatus, setRunStatus] = useState('idle');
  const [showRunPanel, setShowRunPanel] = useState(false);
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);
  const languageRemoteRef = useRef(false);

  function notify(text) { setNotice(text); setTimeout(() => setNotice(''), 3500); }
  function logout() {
    socketRef.current?.disconnect(); socketRef.current = null;
    localStorage.removeItem('collabcode_token'); localStorage.removeItem('collabcode_user');
    setUser(null); setRoom(null); setRoomId(''); history.replaceState({}, '', '/');
  }

  async function submitAuth(e) {
    e.preventDefault(); setBusy(true);
    try {
      const path = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await api(path, { method: 'POST', body: JSON.stringify(form) });
      saveAuth(data); setUser(data.user); notify('Welcome to CollabCode!');
    } catch (err) { notify(err.message); } finally { setBusy(false); }
  }

  async function createRoom() {
    setBusy(true);
    try {
      const data = await api('/api/rooms', { method: 'POST', body: JSON.stringify({ title: 'DSA Practice' }) });
      setRoomId(data.roomId); history.pushState({}, '', `/?room=${data.roomId}`); await enterRoom(data.roomId);
    } catch (err) { notify(err.message); } finally { setBusy(false); }
  }
  async function joinRoom() {
    setBusy(true);
    try {
      const id = roomId.trim().toUpperCase();
      await api(`/api/rooms/${id}/join`, { method: 'POST', body: '{}' });
      history.pushState({}, '', `/?room=${id}`); await enterRoom(id);
    } catch (err) { notify(err.message); } finally { setBusy(false); }
  }
  async function enterRoom(id) {
    try {
      const data = await api(`/api/rooms/${id}/session`);

      // Clean up the previous room's collaboration document.
      bindingRef.current?.destroy();
      bindingRef.current = null;
      awarenessRef.current?.destroy();
      awarenessRef.current = null;

      if (ydocRef.current) {
        ydocRef.current.destroy();
      }

      const doc = new Y.Doc();
      const ytext = doc.getText('monaco');
      const awareness = new Awareness(doc);
      const palette = ['#a5f36b', '#a88bfa', '#54c8ff', '#ff9b71', '#ff79b0', '#f6d365'];
      const colorIndex = [...(user.username || 'user')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % palette.length;
      awareness.setLocalStateField('user', {
        name: user.username || 'Collaborator',
        color: palette[colorIndex]
      });

      ydocRef.current = doc;
      awarenessRef.current = awareness;
      ytextRef.current = ytext;

      setRoomId(data.roomId);
      setLanguage(data.language);
      setMessages(data.messages || []);
      setUsers([]);
      setCode(data.code || '');

      // Keep React's code state updated for saving and AI assistance.
      ytext.observe(() => {
        setCode(ytext.toString());
      });

      socketRef.current?.disconnect();

      const socket = io(API, {
        auth: { token: getToken() },
        reconnection: true,
        reconnectionAttempts: 8
      });

      socketRef.current = socket;

      // Send local Yjs changes to the backend.
      doc.on('update', (update, origin) => {
        if (origin === 'remote' || !socket.connected) return;

        let binary = '';
        for (const byte of update) {
          binary += String.fromCharCode(byte);
        }

        socket.emit('yjs:update', btoa(binary), (result) => {
          if (!result?.ok) {
            notify(result?.error || 'Collaboration update failed');
          }
        });
      });

      socket.on('connect', () => {
        socket.emit('room:join', { roomId: id }, (result) => {
          if (!result?.ok) {
            notify(result?.error || 'Could not join room');
            return;
          }

          setUsers(result.users || []);
          setLanguage(result.language);

          // Apply the server's shared document without echoing it back.
          if (result.ydocState) {
            const binary = atob(result.ydocState);
            const update = Uint8Array.from(
              binary,
              character => character.charCodeAt(0)
            );

            Y.applyUpdate(doc, update, 'remote');
          }

          setCode(ytext.toString());

          // Publish our current cursor immediately after joining/reconnecting.
          const ownClients = [doc.clientID];
          const initialAwareness = encodeAwarenessUpdate(awareness, ownClients);
          let awarenessBinary = '';
          for (const byte of initialAwareness) awarenessBinary += String.fromCharCode(byte);
          socket.emit('awareness:update', {
            clientID: doc.clientID,
            update: btoa(awarenessBinary)
          });

          if (editorRef.current) {
            bindingRef.current?.destroy();
            bindingRef.current = new MonacoBinding(
              ytext,
              editorRef.current.getModel(),
              new Set([editorRef.current]),
              awareness
            );
          }
        });
      });

      awareness.on('update', ({ added, updated, removed }, origin) => {
        if (origin === 'remote' || !socket.connected) return;
        const changedClients = [...added, ...updated, ...removed];
        if (!changedClients.length) return;
        const encoded = encodeAwarenessUpdate(awareness, changedClients);
        let binary = '';
        for (const byte of encoded) binary += String.fromCharCode(byte);
        socket.emit('awareness:update', {
          clientID: doc.clientID,
          update: btoa(binary)
        });
      });

      socket.on('awareness:update', (encodedUpdate) => {
        try {
          const binary = atob(encodedUpdate);
          const update = Uint8Array.from(binary, character => character.charCodeAt(0));
          applyAwarenessUpdate(awareness, update, 'remote');
        } catch (err) {
          console.warn('Could not apply collaborator cursor update:', err);
        }
      });

      socket.on('awareness:remove', ({ clientID }) => {
        if (Number.isInteger(clientID)) {
          removeAwarenessStates(awareness, [clientID], 'remote');
        }
      });

      socket.on('yjs:update', (encodedUpdate) => {
        const binary = atob(encodedUpdate);
        const update = Uint8Array.from(
          binary,
          character => character.charCodeAt(0)
        );

        Y.applyUpdate(doc, update, 'remote');
      });

      socket.on('language:update', ({ language: nextLanguage }) => {
        languageRemoteRef.current = true;
        setLanguage(nextLanguage);
      });

      socket.on('presence:update', setUsers);

      socket.on('chat:new', (msg) => {
        setMessages(old =>
          old.some(m => String(m.id) === String(msg.id))
            ? old
            : [...old, msg]
        );
      });

      socket.on('connect_error', (err) => {
        notify(err.message || 'Connection failed');
      });

      setRoom(data);
    } catch (err) {
      notify(err.message);
    }
  }

  useEffect(() => () => {
    bindingRef.current?.destroy();
    awarenessRef.current?.destroy();
    ydocRef.current?.destroy();
    socketRef.current?.disconnect();
  }, []);

  async function saveSession() {
    try { await api(`/api/rooms/${roomId}/session`, { method: 'PUT', body: JSON.stringify({ code, language }) }); notify('Session saved to PostgreSQL.'); }
    catch (err) { notify(err.message); }
  }
  async function sendMessage(e) {
    e.preventDefault();
    const message = chatInput.trim(); if (!message) return;
    setChatInput('');
    try { await api(`/api/rooms/${roomId}/chat`, { method: 'POST', body: JSON.stringify({ message }) }); }
    catch (err) { notify(err.message); setChatInput(message); }
  }
  async function runCode() {
    setShowRunPanel(true);
    setRunStatus('running');
    setRunOutput('Starting isolated sandbox…');
    try {
      const data = await api('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ roomId, code, language, stdin: runInput })
      });
      const parts = [];
      if (data.stdout) parts.push(data.stdout);
      if (data.stderr) parts.push(data.stderr);
      if (!parts.length) parts.push(data.exitCode === 0 ? '(No output)' : 'Program finished without output.');
      setRunOutput(parts.join('\n'));
      setRunStatus(data.timedOut ? 'timeout' : data.exitCode === 0 ? 'success' : 'error');
    } catch (err) {
      setRunOutput(err.message || 'Code execution failed.');
      setRunStatus('error');
    }
  }

  async function askAI() {
    setBusy(true); setAiAnswer('');
    try {
      const data = await api('/api/ai/assist', { method: 'POST', body: JSON.stringify({ code, language, task: aiTask }) });
      setAiAnswer(data.answer);
    } catch (err) { setAiAnswer(err.message); }
    finally { setBusy(false); }
  }

  if (!user) return <main className="auth-page"><section className="auth-card">
    <div className="brand-mark">⌘</div><h1>CollabCode</h1><p className="muted">Think together. Code together.</p>
    <div className="tabs"><button className={authMode==='login'?'active':''} onClick={()=>setAuthMode('login')}>Log in</button><button className={authMode==='register'?'active':''} onClick={()=>setAuthMode('register')}>Create account</button></div>
    <form onSubmit={submitAuth}>
      {authMode==='register' && <input placeholder="Username" maxLength="30" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength="2"/>}
      <input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
      <input type="password" placeholder="Password (8+ characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={authMode==='register'?8:1}/>
      <button className="primary" disabled={busy}>{busy?'Please wait…':authMode==='register'?'Create account':'Log in'}</button>
    </form><p className="muted small">Your password is hashed by the backend before storage.</p>
  </section>{notice && <div className="toast">{notice}</div>}</main>;

  if (!room) return <main className="home-page"><header className="topbar"><div className="brand"><span className="brand-mark smallmark">⌘</span><b>CollabCode</b></div><div>Signed in as <strong>{user.username}</strong> <button className="quiet" onClick={logout}>Log out</button></div></header>
    <section className="hero"><span className="eyebrow">YOUR SHARED CODING SPACE</span><h1>Better solutions<br/><span>start together.</span></h1><p>Practice DSA, debug tricky problems, and prepare for interviews in one collaborative workspace.</p>
      <div className="home-cards"><article><h2>Create a room</h2><p>Start a private session and invite a friend or mentor.</p><button className="primary" disabled={busy} onClick={createRoom}>＋ Create new room</button></article>
      <article><h2>Join a room</h2><p>Enter the room ID shared with you.</p><input placeholder="8-character room ID" maxLength="8" value={roomId} onChange={e=>setRoomId(e.target.value.toUpperCase())}/><button className="secondary" disabled={busy || roomId.length!==8} onClick={joinRoom}>Join workspace →</button></article></div>
    </section>{notice && <div className="toast">{notice}</div>}</main>;

  return <main className="workspace"><header className="workspace-bar"><div className="brand"><span className="brand-mark smallmark">⌘</span><b>CollabCode</b><span className="room-chip">ROOM {roomId}</span><button className="quiet" onClick={()=>navigator.clipboard.writeText(roomId).then(()=>notify('Room ID copied'))}>Copy ID</button></div><div className="toolbar"><select
  value={language}
  onChange={(e) => {
    const nextLanguage = e.target.value;
    setLanguage(nextLanguage);

    socketRef.current?.emit(
      'language:update',
      { language: nextLanguage },
      (result) => {
        if (!result?.ok) {
          notify(result?.error || 'Language update failed');
        }
      }
    );
  }}
><option value="cpp">C++</option><option value="c">C</option><option value="java">Java</option><option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="go">Go</option><option value="rust">Rust</option></select><button onClick={saveSession}>Save session</button><button className="quiet" onClick={()=>{socketRef.current?.disconnect();socketRef.current=null;setRoom(null);history.pushState({},'','/');}}>Leave</button><button className="quiet" onClick={logout}>Log out</button></div></header>
    <div className="work-grid"><aside className="side-panel"><h3>Participants <span className="count">{users.length}</span></h3>{users.map(u=><div className="participant" key={u.socketId}><span className="online-dot"/><span>{u.username}{u.userId===user.id?' (you)':''}</span></div>)}<div className="panel-divider"/><h3>AI coding tutor</h3><p className="muted small">Ask for help understanding the code you are working on.</p><select value={aiTask} onChange={e=>setAiTask(e.target.value)}><option value="explain">Explain code</option><option value="debug">Find likely bugs</option><option value="improve">Suggest improvements</option><option value="complexity">Explain time & space complexity</option></select><button className="ai-button" onClick={askAI} disabled={busy}>{busy?'Thinking…':'✦ Ask Gemini'}</button>{aiAnswer && <div className="ai-answer">{aiAnswer}</div>}</aside>
    <section className="editor-panel"><div className="editor-heading"><div><strong>{room.title || 'DSA Practice'}</strong><span className="muted small"> · Shared editor</span></div><div className="editor-heading-actions"><span className="live-label"><span className="online-dot"/> Live room</span><button className="run-button" onClick={runCode} disabled={runStatus === 'running'}>{runStatus === 'running' ? 'Running…' : '▶ Run code'}</button></div></div><div className="editor"><Editor
  height="100%"
  language={language === 'cpp' ? 'cpp' : language}
  theme="vs-dark"
  
  onMount={(editor) => {
    editorRef.current = editor;

    const ytext = ytextRef.current;
    if (!ytext) return;

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      awarenessRef.current
    );
  }}

  options={{
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 14 },
    tabSize: 2
  }}
/></div>{showRunPanel && <section className="run-panel"><div className="run-panel-title"><strong>Program I/O</strong><span className={`run-status ${runStatus}`}>{({idle:'Ready',running:'Running',success:'Completed',error:'Failed',timeout:'Timed out'})[runStatus] || 'Ready'}</span><button className="quiet" onClick={() => setShowRunPanel(false)}>Hide</button></div><label htmlFor="program-stdin">Standard input (optional)</label><textarea id="program-stdin" value={runInput} onChange={e=>setRunInput(e.target.value)} placeholder="Enter input for your program…" rows={2}/><label>Output</label><pre className="run-output">{runOutput || 'Click Run code to see output here.'}</pre></section>}<footer className="editor-footer"><span>{language.toUpperCase()} · {code.length} characters</span><span>Saved manually · use “Save session” to persist</span></footer></section>
    <aside className="chat-panel"><h3>Room chat</h3><div className="messages">{messages.map(m=><div className="message" key={m.id}><div><strong>{m.username}</strong><span className="muted tiny">{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><p>{m.message}</p></div>)}</div><form className="chat-form" onSubmit={sendMessage}><input placeholder="Ask a question…" maxLength="1000" value={chatInput} onChange={e=>setChatInput(e.target.value)}/><button className="primary" disabled={!chatInput.trim()}>Send</button></form></aside></div>{notice && <div className="toast">{notice}</div>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);
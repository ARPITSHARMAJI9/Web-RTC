const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
const CODE_LENGTH = 3;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const rooms = new Map();

function newRoomCode() {
  for (let tries = 0; tries < 500; tries++) {
    let c = "";
    for (let i = 0; i < CODE_LENGTH; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#05070d">
<title>Beam - Peer-to-peer file transfer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{
  --void:#05070d; --panel:rgba(14,18,32,.72); --line:rgba(130,160,255,.16);
  --cyan:#5ef2ff; --violet:#8a6bff; --pink:#ff4d8d; --ok:#3dffa8; --bad:#ff5d6c;
  --text:#e8ecff; --dim:#8791b5;
  --font:"Space Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{
  font-family:var(--font);color:var(--text);background:var(--void);
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;overflow-x:hidden;position:relative;
}
/* ambient background */
body::before{
  content:"";position:fixed;inset:0;z-index:-2;
  background:
    radial-gradient(60vmax 40vmax at 15% -10%,rgba(138,107,255,.28),transparent 60%),
    radial-gradient(50vmax 40vmax at 100% 10%,rgba(94,242,255,.16),transparent 60%),
    radial-gradient(50vmax 40vmax at 50% 120%,rgba(255,77,141,.14),transparent 60%);
}
body::after{
  content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:48px 48px;opacity:.35;
  -webkit-mask-image:radial-gradient(ellipse at center,#000 10%,transparent 75%);
  mask-image:radial-gradient(ellipse at center,#000 10%,transparent 75%);
}
.hidden{display:none!important}
header{display:flex;align-items:center;justify-content:space-between;padding:18px clamp(16px,5vw,48px)}
.logo{font-weight:700;font-size:22px;letter-spacing:-.04em;display:flex;align-items:center;gap:10px}
.logo i{width:22px;height:22px;border-radius:50%;border:2px solid var(--cyan);position:relative;box-shadow:0 0 14px var(--cyan)}
.logo i::after{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--violet);box-shadow:0 0 10px var(--violet)}
.status{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;color:var(--dim);
  padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--panel);backdrop-filter:blur(10px)}
#statusDot{width:8px;height:8px;border-radius:50%;background:#555;transition:.3s}
#statusDot.on{background:var(--ok);box-shadow:0 0 10px var(--ok)}
#statusDot.off{background:var(--bad);box-shadow:0 0 10px var(--bad)}
main{flex:1;width:100%;max-width:560px;margin:0 auto;padding:clamp(12px,4vw,40px) 16px 24px;display:flex;flex-direction:column;justify-content:center}
.card{
  background:var(--panel);border:1px solid var(--line);border-radius:28px;padding:clamp(22px,5vw,40px);
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 40px 120px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);
  animation:enter .7s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes enter{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
h1{font-size:clamp(34px,9vw,52px);line-height:1;letter-spacing:-.05em;font-weight:700;margin-bottom:14px;
  background:linear-gradient(100deg,#fff 20%,var(--cyan) 60%,var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{color:var(--dim);line-height:1.6;font-size:15px;max-width:44ch}
.btn{font-family:var(--font);border:none;cursor:pointer;font-weight:700;font-size:16px;border-radius:16px;transition:transform .15s,box-shadow .2s,background .2s,opacity .2s;color:#fff}
.btn:focus-visible,input:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
.primary{width:100%;margin-top:30px;padding:18px;background:linear-gradient(110deg,var(--violet),#5b8cff 55%,var(--cyan));
  box-shadow:0 12px 40px rgba(110,120,255,.4);color:#04060c}
.primary:hover{transform:translateY(-2px);box-shadow:0 18px 50px rgba(110,140,255,.55)}
.primary:active,.ghost:active{transform:scale(.98)}
.ghost{background:rgba(255,255,255,.06);border:1px solid var(--line)}
.ghost:hover{background:rgba(255,255,255,.1)}
.divider{display:flex;align-items:center;gap:14px;margin:26px 0;color:var(--dim);font-size:12px;font-family:var(--mono)}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--line)}
.joinBox{display:flex;gap:10px}
.joinBox input{flex:1;min-width:0;background:rgba(0,0,0,.35);border:1px solid var(--line);color:var(--text);border-radius:16px;
  padding:16px;font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:.5em;text-align:center;text-transform:uppercase;outline:none;transition:border .2s,box-shadow .2s}
.joinBox input::placeholder{letter-spacing:.1em;font-size:14px;font-weight:500;color:#586088}
.joinBox input:focus{border-color:var(--cyan);box-shadow:0 0 0 4px rgba(94,242,255,.12)}
.joinBox .btn{padding:0 26px}
.message{text-align:center;color:var(--bad);margin-top:16px;min-height:20px;font-size:14px}
.limit{margin-top:10px;text-align:center;color:var(--dim);font-size:12px;font-family:var(--mono)}

/* room header: the signature element */
.link{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:26px}
.node{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:22px;
  background:rgba(0,0,0,.4);border:1.5px solid var(--line);transition:.5s;flex:none}
.node.live{border-color:var(--cyan);box-shadow:0 0 28px rgba(94,242,255,.45),inset 0 0 18px rgba(94,242,255,.2)}
.beam{height:2px;flex:1;max-width:160px;background:var(--line);position:relative;overflow:hidden;border-radius:2px}
.beam.live{background:linear-gradient(90deg,var(--cyan),var(--violet))}
.beam.live::after{content:"";position:absolute;top:0;bottom:0;width:36%;
  background:linear-gradient(90deg,transparent,#fff,transparent);animation:pulse 1.4s linear infinite}
.beam.wait::after{content:"";position:absolute;top:0;bottom:0;width:30%;background:linear-gradient(90deg,transparent,var(--violet),transparent);animation:pulse 2.2s ease-in-out infinite}
@keyframes pulse{from{left:-40%}to{left:110%}}
.codeLabel{text-align:center;color:var(--dim);font-size:13px;margin-bottom:12px}
.code{display:flex;justify-content:center;gap:10px;margin-bottom:14px}
.code span{width:clamp(70px,22vw,96px);height:clamp(88px,26vw,116px);display:grid;place-items:center;font-family:var(--mono);font-weight:700;
  font-size:clamp(46px,14vw,64px);border-radius:20px;background:rgba(0,0,0,.4);border:1px solid var(--line);
  color:#fff;text-shadow:0 0 22px var(--cyan);box-shadow:inset 0 -18px 30px rgba(94,242,255,.06)}
.actions{display:flex;justify-content:center;gap:10px;margin-bottom:26px}
.actions .btn{padding:10px 18px;font-size:13px;border-radius:12px}
.connection{text-align:center;font-family:var(--mono);font-size:12px;color:var(--dim);margin-bottom:22px}
.dropZone{border:1.5px dashed rgba(130,160,255,.3);border-radius:22px;padding:clamp(34px,8vw,56px) 18px;text-align:center;transition:.25s;cursor:pointer;position:relative}
.dropZone:hover,.dropZone.dragover{border-color:var(--cyan);background:rgba(94,242,255,.06);box-shadow:inset 0 0 50px rgba(94,242,255,.08)}
.dropZone.disabled{opacity:.5;cursor:not-allowed}
.uploadIcon{width:58px;height:58px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;font-size:26px;
  background:linear-gradient(135deg,rgba(138,107,255,.3),rgba(94,242,255,.2));border:1px solid var(--line)}
.dropZone h2{font-size:20px;margin-bottom:6px;letter-spacing:-.02em}
.dropZone p{color:var(--dim);font-size:14px}
.dropLimit{margin-top:14px;color:var(--dim);font-size:11px;font-family:var(--mono)}
#fileList{margin-top:6px}
.fileItem{margin-top:14px;padding:16px;background:rgba(0,0,0,.32);border:1px solid var(--line);border-radius:16px;animation:enter .4s both}
.fileTop{display:flex;justify-content:space-between;gap:12px;align-items:center}
.fileName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;font-size:14px}
.fileSize{color:var(--dim);font-size:12px;font-family:var(--mono);flex:none}
.progress{margin-top:12px;height:5px;background:rgba(255,255,255,.08);border-radius:10px;overflow:hidden}
.progressBar{height:100%;width:0;background:linear-gradient(90deg,var(--violet),var(--cyan));box-shadow:0 0 12px var(--cyan);transition:width .12s}
.fileStatus{margin-top:9px;color:var(--dim);font-size:12px;font-family:var(--mono)}
.fileStatus.done{color:var(--ok)}
.download{display:inline-block;color:#04060c;background:var(--cyan);text-decoration:none;font-weight:700;padding:7px 14px;border-radius:10px;font-family:var(--font);font-size:13px}
.leave{width:100%;margin-top:24px;padding:12px;background:transparent;color:var(--dim);border:none;cursor:pointer;font-family:var(--font);font-size:14px}
.leave:hover{color:var(--bad)}
footer{text-align:center;padding:16px;color:#4b5375;font-size:11px;font-family:var(--mono)}
@media(max-width:480px){
  .joinBox{flex-direction:column}.joinBox .btn{padding:15px}
  .card{border-radius:22px}.code{gap:8px}
}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>

<header>
  <div class="logo"><i></i>Beam</div>
  <div class="status"><span id="statusDot"></span><span id="statusText">Offline</span></div>
</header>

<main>

<section id="roomScreen" class="card">
  <h1>Send files, straight to the other device.</h1>
  <p class="lead">Create a room, share the 3-character code and files travel directly between your devices. Nothing is stored on a server.</p>
  <button id="createBtn" class="btn primary">Create room</button>
  <div class="divider"><span>or join one</span></div>
  <div class="joinBox">
    <input id="roomInput" maxlength="3" placeholder="Room code" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text">
    <button id="joinBtn" class="btn ghost">Join</button>
  </div>
  <div id="message" class="message" role="alert"></div>
  <div class="limit">Max file size: <span id="limitText"></span></div>
</section>

<section id="transferScreen" class="card hidden">
  <div class="link">
    <div class="node live" id="nodeA">&#128187;</div>
    <div class="beam wait" id="beam"></div>
    <div class="node" id="nodeB">&#128241;</div>
  </div>
  <div class="codeLabel">Share this code to connect</div>
  <div class="code" id="codeCells"><span>-</span><span>-</span><span>-</span></div>
  <div class="actions">
    <button id="copyBtn" class="btn ghost">Copy code</button>
  </div>
  <div id="connection" class="connection">Waiting for the other device</div>

  <div id="dropZone" class="dropZone disabled">
    <div class="uploadIcon">&#8593;</div>
    <h2>Drop files here</h2>
    <p>or tap to choose files</p>
    <input id="fileInput" type="file" multiple hidden>
    <div class="dropLimit">Up to <span id="limitText2"></span> per file</div>
  </div>

  <div id="fileList"></div>
  <button id="leaveBtn" class="leave">Leave room</button>
</section>

</main>

<footer>Beam &bull; encrypted peer-to-peer transfer</footer>

<script>
const MAX_FILE_SIZE = __MAX__;
const CODE_LENGTH = __LEN__;
const CHUNK_SIZE = 64 * 1024;

let socket = null, peer = null, channel = null, room = null;
let wantCreate = false, initiator = false;
let incomingFile = null, incomingChunks = [], incomingBytes = 0;

const $ = id => document.getElementById(id);
const roomScreen = $("roomScreen"), transferScreen = $("transferScreen");
const createBtn = $("createBtn"), joinBtn = $("joinBtn"), roomInput = $("roomInput");
const message = $("message"), connection = $("connection"), dropZone = $("dropZone");
const fileInput = $("fileInput"), fileList = $("fileList");
const copyBtn = $("copyBtn"), leaveBtn = $("leaveBtn");
const statusDot = $("statusDot"), statusText = $("statusText");
const beam = $("beam"), nodeB = $("nodeB"), codeCells = $("codeCells");

$("limitText").textContent = formatBytes(MAX_FILE_SIZE);
$("limitText2").textContent = formatBytes(MAX_FILE_SIZE);

// ---------- room actions ----------
createBtn.onclick = () => {
  message.textContent = "";
  wantCreate = true;
  initiator = true;
  connect();
};

function doJoin() {
  const code = roomInput.value.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) {
    message.textContent = "Enter the " + CODE_LENGTH + "-character room code.";
    return;
  }
  message.textContent = "";
  room = code;
  wantCreate = false;
  initiator = false;
  connect();
}
joinBtn.onclick = doJoin;
roomInput.addEventListener("keydown", e => { if (e.key === "Enter") doJoin(); });

// ---------- signaling ----------
function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(protocol + "//" + location.host);

  socket.onopen = () => {
    socket.send(JSON.stringify(wantCreate ? { type: "create" } : { type: "join", room: room }));
  };

  socket.onmessage = async event => {
    const data = JSON.parse(event.data);

    if (data.type === "joined") {
      room = data.room;
      roomScreen.classList.add("hidden");
      transferScreen.classList.remove("hidden");
      showCode(room);
      connection.textContent = data.users === 1 ? "Waiting for the other device" : "Connecting...";
      return;
    }
    if (data.type === "peer-joined") {
      connection.textContent = "Connecting...";
      if (initiator) await createOffer();
      return;
    }
    if (data.type === "signal") { await signal(data.signal); return; }
    if (data.type === "peer-left") {
      resetPeer();
      setDisconnected("The other device left. Share the code to reconnect.");
      return;
    }
    if (data.type === "error") {
      message.textContent = data.message;
      if (socket) socket.close();
    }
  };

  socket.onclose = () => {
    if (!transferScreen.classList.contains("hidden")) setDisconnected("Connection to server closed");
  };
  socket.onerror = () => { message.textContent = "Could not reach the server. Try again."; };
}

function showCode(code) {
  codeCells.innerHTML = "";
  for (const ch of code) {
    const s = document.createElement("span");
    s.textContent = ch;
    codeCells.appendChild(s);
  }
}

// ---------- WebRTC ----------
function createPeer() {
  peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

  peer.onicecandidate = event => {
    if (event.candidate) sendSignal({ candidate: event.candidate });
  };
  peer.onconnectionstatechange = () => {
    const s = peer ? peer.connectionState : "closed";
    if (s === "connected") setConnected();
    if (s === "disconnected" || s === "failed" || s === "closed") setDisconnected("Device disconnected");
  };
  peer.ondatachannel = event => setupChannel(event.channel);
}

function resetPeer() {
  if (channel) { try { channel.close(); } catch (e) {} }
  if (peer) { try { peer.close(); } catch (e) {} }
  peer = null; channel = null;
  incomingFile = null; incomingChunks = []; incomingBytes = 0;
}

async function createOffer() {
  resetPeer();
  createPeer();
  channel = peer.createDataChannel("files");
  setupChannel(channel);
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  sendSignal({ description: peer.localDescription });
}

async function signal(data) {
  if (!peer) createPeer();

  if (data.description) {
    if (data.description.type === "offer") {
      await peer.setRemoteDescription(data.description);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      sendSignal({ description: peer.localDescription });
    } else if (data.description.type === "answer") {
      await peer.setRemoteDescription(data.description);
    }
  }
  if (data.candidate) {
    try { await peer.addIceCandidate(data.candidate); } catch (e) { console.log(e); }
  }
}

function sendSignal(sig) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "signal", signal: sig }));
  }
}

function setupChannel(ch) {
  channel = ch;
  channel.binaryType = "arraybuffer";
  channel.onopen = () => setConnected();
  channel.onclose = () => setDisconnected("Transfer connection closed");
  channel.onmessage = event => receiveData(event);
}

// ---------- sending ----------
async function sendFile(file) {
  if (!channel || channel.readyState !== "open") {
    alert("The other device is not connected yet.");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    alert(file.name + " is larger than " + formatBytes(MAX_FILE_SIZE) + ".");
    return;
  }

  const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  addFile(file.name, file.size, id, "Sending...");

  channel.send(JSON.stringify({ type: "file-start", id: id, name: file.name, size: file.size, mime: file.type }));

  let offset = 0;
  while (offset < file.size) {
    const buffer = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    while (channel.bufferedAmount > 4 * 1024 * 1024) {
      await new Promise(r => setTimeout(r, 20));
    }
    if (!channel || channel.readyState !== "open") { updateStatus(id, "Interrupted", false); return; }
    channel.send(buffer);
    offset += buffer.byteLength;
    updateProgress(id, (offset / file.size) * 100);
  }

  channel.send(JSON.stringify({ type: "file-end", id: id }));
  updateStatus(id, "Sent", true);
}

// ---------- receiving ----------
function receiveData(event) {
  if (typeof event.data === "string") {
    const data = JSON.parse(event.data);
    if (data.type === "file-start") {
      incomingFile = data;
      incomingChunks = [];
      incomingBytes = 0;
      addFile(data.name, data.size, data.id, "Receiving...");
      return;
    }
    if (data.type === "file-end") { finishFile(); return; }
  }
  if (event.data instanceof ArrayBuffer) {
    incomingChunks.push(event.data);
    incomingBytes += event.data.byteLength;
    if (incomingFile) updateProgress(incomingFile.id, (incomingBytes / incomingFile.size) * 100);
  }
}

function finishFile() {
  if (!incomingFile) return;
  const blob = new Blob(incomingChunks, { type: incomingFile.mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const item = document.querySelector('[data-id="' + incomingFile.id + '"]');
  if (item) {
    const status = item.querySelector(".fileStatus");
    status.className = "fileStatus";
    status.innerHTML = '<a class="download" href="' + url + '" download="' + escapeHTML(incomingFile.name).replace(/"/g, "&quot;") + '">Download</a>';
  }
  updateProgress(incomingFile.id, 100);
  incomingFile = null; incomingChunks = []; incomingBytes = 0;
}

// ---------- UI ----------
function addFile(name, size, id, status) {
  const item = document.createElement("div");
  item.className = "fileItem";
  item.dataset.id = id;
  item.innerHTML =
    '<div class="fileTop"><div class="fileName">' + escapeHTML(name) + '</div>' +
    '<div class="fileSize">' + formatBytes(size) + '</div></div>' +
    '<div class="progress"><div class="progressBar"></div></div>' +
    '<div class="fileStatus">' + status + '</div>';
  fileList.prepend(item);
}

function updateProgress(id, percent) {
  const item = document.querySelector('[data-id="' + id + '"]');
  if (!item) return;
  item.querySelector(".progressBar").style.width = Math.min(percent, 100) + "%";
}

function updateStatus(id, text, done) {
  const item = document.querySelector('[data-id="' + id + '"]');
  if (!item) return;
  const s = item.querySelector(".fileStatus");
  s.textContent = text;
  s.className = "fileStatus" + (done ? " done" : "");
}

function setConnected() {
  connection.textContent = "Connected. Ready to transfer.";
  statusText.textContent = "Connected";
  statusDot.className = "on";
  beam.className = "beam live";
  nodeB.classList.add("live");
  dropZone.classList.remove("disabled");
}

function setDisconnected(text) {
  connection.textContent = text;
  statusText.textContent = "Disconnected";
  statusDot.className = "off";
  beam.className = "beam wait";
  nodeB.classList.remove("live");
  dropZone.classList.add("disabled");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + units[i];
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- file input / drag & drop ----------
dropZone.onclick = () => { if (!dropZone.classList.contains("disabled")) fileInput.click(); };
fileInput.onchange = () => { [...fileInput.files].forEach(sendFile); fileInput.value = ""; };

dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  [...e.dataTransfer.files].forEach(sendFile);
});

// ---------- copy / leave ----------
copyBtn.onclick = async () => {
  try { await navigator.clipboard.writeText(room); } catch (e) {}
  copyBtn.textContent = "Copied";
  setTimeout(() => { copyBtn.textContent = "Copy code"; }, 1500);
};

leaveBtn.onclick = () => {
  if (socket) socket.close();
  if (peer) peer.close();
  location.reload();
};
</script>
</body>
</html>`
  .replace("__MAX__", String(MAX_FILE_SIZE))
  .replace("__LEN__", String(CODE_LENGTH));

app.get("/", (req, res) => {
  res.send(HTML);
});

// ======================================================
// WEBSOCKET SERVER
// ======================================================

function joinRoom(ws, code) {
  const room = rooms.get(code);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found. Check the code and try again." }));
    return false;
  }
  if (room.size >= 2) {
    ws.send(JSON.stringify({ type: "error", message: "Room is full." }));
    return false;
  }
  room.add(ws);
  ws.send(JSON.stringify({ type: "joined", room: code, users: room.size }));

  room.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "peer-joined" }));
    }
  });
  return true;
}

wss.on("connection", ws => {
  let roomCode = null;

  ws.on("message", raw => {
    try {
      const data = JSON.parse(raw);

      if (data.type === "create") {
        const code = newRoomCode();
        if (!code) {
          ws.send(JSON.stringify({ type: "error", message: "No free rooms right now. Try again soon." }));
          return;
        }
        rooms.set(code, new Set());
        if (joinRoom(ws, code)) roomCode = code;
        return;
      }

      if (data.type === "join") {
        const code = String(data.room || "").toUpperCase().slice(0, CODE_LENGTH);
        if (joinRoom(ws, code)) roomCode = code;
        return;
      }

      if (data.type === "signal") {
        const room = rooms.get(roomCode);
        if (!room) return;
        room.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "signal", signal: data.signal }));
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  });

  ws.on("close", () => {
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    room.delete(ws);
    room.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "peer-left" }));
      }
    });
    if (room.size === 0) rooms.delete(roomCode);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("=================================");
  console.log("        BEAM IS RUNNING");
  console.log("=================================");
  console.log("");
  console.log("Laptop:");
  console.log("http://localhost:" + PORT);
  console.log("");
  console.log("For phone on same Wi-Fi:");
  console.log("http://YOUR-IP:" + PORT);
  console.log("");
  console.log("Maximum file size: 1GB");
  console.log("");
});

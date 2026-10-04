const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ======================================================
// ROOMS
// ======================================================

const rooms = new Map();


// ======================================================
// HTML + CSS + JAVASCRIPT
// ======================================================

const HTML = `

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>WebRTC - File Transfer</title>

<style>

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {

    font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background:
        radial-gradient(
            circle at top,
            #18102b,
            #08080a 55%
        );

    color: white;

    min-height: 100vh;

}


header {

    height: 70px;

    display: flex;

    align-items: center;

    justify-content: space-between;

    padding: 0 6%;

    border-bottom:
        1px solid rgba(255,255,255,.08);

}


.logo {

    font-size: 25px;

    font-weight: 800;

    letter-spacing: -1px;

}

.logo span {

    color: #8b5cf6;

}


.status {

    display: flex;

    align-items: center;

    gap: 8px;

    font-size: 13px;

    color: #aaa;

}


#statusDot {

    width: 9px;

    height: 9px;

    border-radius: 50%;

    background: #666;

}


main {

    width: 100%;

    max-width: 760px;

    margin: auto;

    padding: 55px 20px;

}


.card {

    background:
        rgba(17,17,20,.92);

    border:
        1px solid rgba(255,255,255,.08);

    border-radius: 24px;

    padding: 40px;

    box-shadow:
        0 30px 100px rgba(0,0,0,.45);

}


.hidden {

    display: none !important;

}


.hero {

    text-align: center;

}


.icon {

    font-size: 50px;

    margin-bottom: 20px;

}


h1 {

    font-size: 40px;

    letter-spacing: -1px;

    margin-bottom: 14px;

}


.hero p {

    color: #999;

    line-height: 1.6;

    max-width: 520px;

    margin: auto;

}


.primary {

    width: 100%;

    margin-top: 35px;

    padding: 16px;

    border: none;

    border-radius: 12px;

    background: #7c3aed;

    color: white;

    font-size: 16px;

    font-weight: 700;

    cursor: pointer;

}


.primary:hover {

    background: #8b5cf6;

    transform: translateY(-1px);

}


.divider {

    display: flex;

    align-items: center;

    gap: 15px;

    margin: 30px 0;

    color: #555;

    font-size: 12px;

}


.divider::before,
.divider::after {

    content: "";

    height: 1px;

    background: #29292d;

    flex: 1;

}


.joinBox {

    display: flex;

    gap: 10px;

}


.joinBox input {

    flex: 1;

    background: #18181b;

    border:
        1px solid #303036;

    color: white;

    border-radius: 12px;

    padding: 15px;

    font-size: 16px;

    outline: none;

    text-transform: uppercase;

}


.joinBox button {

    background: #27272a;

    color: white;

    border: none;

    padding: 0 25px;

    border-radius: 12px;

    cursor: pointer;

    font-weight: 700;

}


.message {

    text-align: center;

    color: #ef4444;

    margin-top: 15px;

    min-height: 20px;

}


.limit {

    margin-top: 25px;

    text-align: center;

    color: #666;

    font-size: 12px;

}


.roomHeader {

    display: flex;

    justify-content: space-between;

    align-items: center;

    margin-bottom: 30px;

}


.small {

    color: #666;

    font-size: 10px;

    letter-spacing: 2px;

    margin-bottom: 7px;

}


.roomCode {

    display: flex;

    align-items: center;

    gap: 10px;

}


.roomCode strong {

    font-size: 28px;

    letter-spacing: 5px;

}


.copy {

    border: none;

    background: #27272a;

    color: white;

    padding: 7px 12px;

    border-radius: 8px;

    cursor: pointer;

    font-size: 11px;

}


.connection {

    padding: 8px 13px;

    background: #18181b;

    border-radius: 20px;

    color: #aaa;

    font-size: 12px;

}


.dropZone {

    border:
        2px dashed #35353b;

    border-radius: 20px;

    padding: 65px 20px;

    text-align: center;

    transition: .2s;

}


.dropZone.dragover {

    border-color: #8b5cf6;

    background:
        rgba(124,58,237,.08);

}


.uploadIcon {

    font-size: 45px;

    margin-bottom: 15px;

}


.dropZone h2 {

    margin-bottom: 8px;

}


.dropZone p {

    color: #777;

    margin-bottom: 20px;

}


.secondary {

    background: #27272a;

    color: white;

    border: none;

    padding: 12px 22px;

    border-radius: 10px;

    cursor: pointer;

    font-weight: 700;

}


.dropLimit {

    margin-top: 18px;

    color: #555;

    font-size: 11px;

}


.fileItem {

    margin-top: 15px;

    padding: 15px;

    background: #18181b;

    border-radius: 12px;

}


.fileTop {

    display: flex;

    justify-content: space-between;

    gap: 10px;

}


.fileName {

    overflow: hidden;

    text-overflow: ellipsis;

    white-space: nowrap;

}


.fileSize {

    color: #777;

    font-size: 12px;

}


.progress {

    margin-top: 12px;

    height: 5px;

    background: #29292d;

    border-radius: 10px;

    overflow: hidden;

}


.progressBar {

    height: 100%;

    width: 0%;

    background: #8b5cf6;

    transition: width .1s;

}


.fileStatus {

    margin-top: 8px;

    color: #777;

    font-size: 12px;

}


.download {

    color: #a78bfa;

    text-decoration: none;

    font-weight: 700;

}


.leave {

    width: 100%;

    margin-top: 25px;

    padding: 12px;

    background: transparent;

    color: #777;

    border: none;

    cursor: pointer;

}


footer {

    text-align: center;

    padding: 20px;

    color: #444;

    font-size: 11px;

}


@media(max-width:600px) {

    header {

        padding: 0 20px;

    }

    main {

        padding: 20px 12px;

    }

    .card {

        padding: 25px 18px;

        border-radius: 18px;

    }

    h1 {

        font-size: 30px;

    }

    .roomHeader {

        flex-direction: column;

        align-items: flex-start;

        gap: 15px;

    }

    .joinBox {

        flex-direction: column;

    }

    .joinBox button {

        padding: 14px;

    }

    .dropZone {

        padding: 45px 15px;

    }

}

</style>

</head>


<body>


<header>

    <div class="logo">

        Web<span>RTC</span>

    </div>


    <div class="status">

        <span id="statusDot"></span>

        <span id="statusText">

            Not Connected

        </span>

    </div>

</header>


<main>


<!-- ROOM -->

<section
id="roomScreen"
class="card"
>


    <div class="hero">


        <div class="icon">

            ⚡

        </div>


        <h1>

            Send files directly.

        </h1>


        <p>

            Create a room, share the code
            and transfer files directly
            between your devices.

        </p>


    </div>


    <button
        id="createBtn"
        class="primary"
    >

        Create Room

    </button>


    <div class="divider">

        <span>OR</span>

    </div>


    <div class="joinBox">


        <input
            id="roomInput"
            maxlength="6"
            placeholder="Enter room code"
        >


        <button id="joinBtn">

            Join

        </button>


    </div>


    <div
        id="message"
        class="message"
    ></div>


    <div class="limit">

        Maximum file size:
        <strong>100 MB</strong>

    </div>


</section>


<!-- TRANSFER -->

<section
id="transferScreen"
class="card hidden"
>


    <div class="roomHeader">


        <div>

            <div class="small">

                ROOM CODE

            </div>


            <div class="roomCode">

                <strong
                    id="roomCode"
                >
                    ------
                </strong>


                <button
                    id="copyBtn"
                    class="copy"
                >

                    Copy

                </button>

            </div>

        </div>


        <div
            id="connection"
            class="connection"
        >

            Waiting...

        </div>


    </div>


    <div
        id="dropZone"
        class="dropZone"
    >


        <div class="uploadIcon">

            ↑

        </div>


        <h2>

            Drop files here

        </h2>


        <p>

            or click to browse

        </p>


        <input
            id="fileInput"
            type="file"
            multiple
            hidden
        >


        <button
            id="browseBtn"
            class="secondary"
        >

            Choose Files

        </button>


        <div class="dropLimit">

            Maximum 100 MB per file

        </div>


    </div>


    <div id="fileList"></div>


    <button
        id="leaveBtn"
        class="leave"
    >

        Leave Room

    </button>


</section>


</main>


<footer>

    WebRTC • Peer-to-peer file transfer

</footer>


<script>


// ======================================================
// VARIABLES
// ======================================================

const MAX_FILE_SIZE =
    ${MAX_FILE_SIZE};

const CHUNK_SIZE =
    64 * 1024;


let socket = null;

let peer = null;

let channel = null;

let room = null;

let initiator = false;


let incomingFile = null;

let incomingChunks = [];

let incomingBytes = 0;


// ======================================================
// ELEMENTS
// ======================================================

const roomScreen =
    document.getElementById(
        "roomScreen"
    );


const transferScreen =
    document.getElementById(
        "transferScreen"
    );


const createBtn =
    document.getElementById(
        "createBtn"
    );


const joinBtn =
    document.getElementById(
        "joinBtn"
    );


const roomInput =
    document.getElementById(
        "roomInput"
    );


const message =
    document.getElementById(
        "message"
    );


const roomCode =
    document.getElementById(
        "roomCode"
    );


const connection =
    document.getElementById(
        "connection"
    );


const dropZone =
    document.getElementById(
        "dropZone"
    );


const fileInput =
    document.getElementById(
        "fileInput"
    );


const browseBtn =
    document.getElementById(
        "browseBtn"
    );


const fileList =
    document.getElementById(
        "fileList"
    );


const copyBtn =
    document.getElementById(
        "copyBtn"
    );


const leaveBtn =
    document.getElementById(
        "leaveBtn"
    );


const statusDot =
    document.getElementById(
        "statusDot"
    );


const statusText =
    document.getElementById(
        "statusText"
    );


// ======================================================
// ROOM CODE
// ======================================================

function generateRoom() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        result +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }

    return result;

}


// ======================================================
// CREATE ROOM
// ======================================================

createBtn.onclick = () => {

    message.textContent = "";

    room =
        generateRoom();

    initiator = true;

    connect();

};


// ======================================================
// JOIN ROOM
// ======================================================

joinBtn.onclick = () => {

    const code =
        roomInput.value
            .trim()
            .toUpperCase();


    if (code.length !== 6) {

        message.textContent =
            "Enter a valid 6-character room code.";

        return;

    }


    message.textContent = "";

    room = code;

    initiator = false;

    connect();

};


// ======================================================
// SOCKET
// ======================================================

function connect() {

    const protocol =
        location.protocol === "https:"
            ? "wss:"
            : "ws:";


    socket =
        new WebSocket(
            protocol +
            "//" +
            location.host
        );


    socket.onopen = () => {

        socket.send(
            JSON.stringify({

                type: "join",

                room: room

            })
        );

    };


    socket.onmessage =
        async event => {

            const data =
                JSON.parse(
                    event.data
                );


            if (
                data.type === "joined"
            ) {

                roomScreen
                    .classList
                    .add("hidden");


                transferScreen
                    .classList
                    .remove("hidden");


                roomCode.textContent =
                    room;


                connection.textContent =
                    data.users === 1
                        ? "Waiting for device..."
                        : "Connecting...";


                return;

            }


            if (
                data.type ===
                "peer-joined"
            ) {

                if (initiator) {

                    await createOffer();

                }

                return;

            }


            if (
                data.type ===
                "signal"
            ) {

                await signal(
                    data.signal
                );

                return;

            }


            if (
                data.type ===
                "peer-left"
            ) {

                setDisconnected(
                    "Device disconnected"
                );

                return;

            }


            if (
                data.type ===
                "error"
            ) {

                message.textContent =
                    data.message;

            }

        };


    socket.onclose = () => {

        setDisconnected(
            "Connection closed"
        );

    };

}


// ======================================================
// WEBRTC
// ======================================================

function createPeer() {

    peer =
        new RTCPeerConnection({

            iceServers: [

                {
                    urls:
                        "stun:stun.l.google.com:19302"
                }

            ]

        });


    peer.onicecandidate =
        event => {

            if (
                event.candidate
            ) {

                sendSignal({

                    candidate:
                        event.candidate

                });

            }

        };


    peer.onconnectionstatechange =
        () => {

            const state =
                peer.connectionState;


            if (
                state === "connected"
            ) {

                setConnected();

            }


            if (
                state === "disconnected" ||
                state === "failed" ||
                state === "closed"
            ) {

                setDisconnected(
                    "Disconnected"
                );

            }

        };


    peer.ondatachannel =
        event => {

            setupChannel(
                event.channel
            );

        };

}


// ======================================================
// OFFER
// ======================================================

async function createOffer() {

    createPeer();


    channel =
        peer.createDataChannel(
            "files"
        );


    setupChannel(
        channel
    );


    const offer =
        await peer.createOffer();


    await peer.setLocalDescription(
        offer
    );


    sendSignal({

        description:
            peer.localDescription

    });

}


// ======================================================
// SIGNAL
// ======================================================

async function signal(data) {

    if (!peer) {

        createPeer();

    }


    if (data.description) {

        if (
            data.description.type ===
            "offer"
        ) {

            await peer.setRemoteDescription(
                data.description
            );


            const answer =
                await peer.createAnswer();


            await peer.setLocalDescription(
                answer
            );


            sendSignal({

                description:
                    peer.localDescription

            });

        }


        else if (
            data.description.type ===
            "answer"
        ) {

            await peer.setRemoteDescription(
                data.description
            );

        }

    }


    if (data.candidate) {

        try {

            await peer.addIceCandidate(
                data.candidate
            );

        }

        catch (error) {

            console.log(error);

        }

    }

}


// ======================================================
// SEND SIGNAL
// ======================================================

function sendSignal(signal) {

    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify({

                type: "signal",

                signal: signal

            })
        );

    }

}


// ======================================================
// DATA CHANNEL
// ======================================================

function setupChannel(ch) {

    channel = ch;

    channel.binaryType =
        "arraybuffer";


    channel.onopen = () => {

        setConnected();

    };


    channel.onclose = () => {

        setDisconnected(
            "Transfer connection closed"
        );

    };


    channel.onmessage =
        event => {

            receiveData(
                event
            );

        };

}


// ======================================================
// SEND FILE
// ======================================================

async function sendFile(file) {

    if (
        !channel ||
        channel.readyState !== "open"
    ) {

        alert(
            "Other device is not connected yet."
        );

        return;

    }


    if (
        file.size >
        MAX_FILE_SIZE
    ) {

        alert(
            file.name +
            " is larger than 100 MB."
        );

        return;

    }


    const id =
        crypto.randomUUID();


    addFile(

        file.name,

        file.size,

        id,

        "Sending..."

    );


    channel.send(

        JSON.stringify({

            type:
                "file-start",

            id:
                id,

            name:
                file.name,

            size:
                file.size,

            mime:
                file.type

        })

    );


    let offset = 0;


    while (
        offset < file.size
    ) {


        const chunk =
            file.slice(

                offset,

                offset +
                CHUNK_SIZE

            );


        const buffer =
            await chunk.arrayBuffer();


        while (
            channel.bufferedAmount >
            4 * 1024 * 1024
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        20
                    )
            );

        }


        channel.send(
            buffer
        );


        offset +=
            buffer.byteLength;


        updateProgress(

            id,

            (
                offset /
                file.size
            ) * 100

        );

    }


    channel.send(

        JSON.stringify({

            type:
                "file-end",

            id:
                id

        })

    );


    updateStatus(

        id,

        "Sent ✓"

    );

}


// ======================================================
// RECEIVE FILE
// ======================================================

function receiveData(event) {

    if (
        typeof event.data ===
        "string"
    ) {

        const data =
            JSON.parse(
                event.data
            );


        if (
            data.type ===
            "file-start"
        ) {

            incomingFile =
                data;


            incomingChunks = [];

            incomingBytes = 0;


            addFile(

                data.name,

                data.size,

                data.id,

                "Receiving..."

            );


            return;

        }


        if (
            data.type ===
            "file-end"
        ) {

            finishFile();

            return;

        }

    }


    if (
        event.data instanceof
        ArrayBuffer
    ) {

        incomingChunks.push(
            event.data
        );


        incomingBytes +=
            event.data.byteLength;


        if (incomingFile) {

            updateProgress(

                incomingFile.id,

                (
                    incomingBytes /
                    incomingFile.size
                ) * 100

            );

        }

    }

}


// ======================================================
// FINISH FILE
// ======================================================

function finishFile() {

    if (!incomingFile)
        return;


    const blob =
        new Blob(

            incomingChunks,

            {
                type:
                    incomingFile.mime ||
                    "application/octet-stream"
            }

        );


    const url =
        URL.createObjectURL(
            blob
        );


    const item =
        document.querySelector(

            '[data-id="' +
            incomingFile.id +
            '"]'

        );


    if (item) {

        const status =
            item.querySelector(
                ".fileStatus"
            );


        status.innerHTML =
    '<a class="download" href="' +
    url +
    '" download="' +
    escapeHTML(incomingFile.name) +
    '">Download</a>';

    }


    updateProgress(

        incomingFile.id,

        100

    );


    incomingFile = null;

    incomingChunks = [];

    incomingBytes = 0;

}


// ======================================================
// UI
// ======================================================

function addFile(
    name,
    size,
    id,
    status
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "fileItem";


    item.dataset.id =
        id;


    item.innerHTML =
        '<div class="fileTop">' +
        '<div class="fileName">' +
        escapeHTML(name) +
        '</div>' +
        '<div class="fileSize">' +
        formatBytes(size) +
        '</div>' +
        '</div>' +
        '<div class="progress">' +
        '<div class="progressBar"></div>' +
        '</div>' +
        '<div class="fileStatus">' +
        status +
        '</div>';


    fileList.prepend(
        item
    );

}


function updateProgress(
    id,
    percent
) {

    const item =
        document.querySelector(

            '[data-id="' +
            id +
            '"]'

        );


    if (!item)
        return;


    const bar =
        item.querySelector(
            ".progressBar"
        );


    bar.style.width =
        Math.min(
            percent,
            100
        ) + "%";

}


function updateStatus(
    id,
    text
) {

    const item =
        document.querySelector(

            '[data-id="' +
            id +
            '"]'

        );


    if (!item)
        return;


    const status =
        item.querySelector(
            ".fileStatus"
        );


    status.textContent =
        text;

}


function setConnected() {

    connection.textContent =
        "🟢 Connected";


    statusText.textContent =
        "Connected";


    statusDot.style.background =
        "#22c55e";

}


function setDisconnected(
    text
) {

    connection.textContent =
        text;


    statusText.textContent =
        "Disconnected";


    statusDot.style.background =
        "#ef4444";

}


function formatBytes(bytes) {

    if (
        bytes === 0
    )
        return "0 Bytes";


    const units = [

        "Bytes",
        "KB",
        "MB",
        "GB"

    ];


    const index =
        Math.floor(

            Math.log(bytes) /
            Math.log(1024)

        );


    return (

        parseFloat(

            (
                bytes /
                Math.pow(
                    1024,
                    index
                )

            ).toFixed(2)

        )

        + " " +

        units[index]

    );

}


function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


// ======================================================
// FILE INPUT
// ======================================================

browseBtn.onclick = () => {

    fileInput.click();

};


fileInput.onchange = () => {

    [...fileInput.files]
        .forEach(
            sendFile
        );


    fileInput.value = "";

};


// ======================================================
// DRAG & DROP
// ======================================================

dropZone.addEventListener(

    "dragover",

    event => {

        event.preventDefault();

        dropZone.classList.add(
            "dragover"
        );

    }

);


dropZone.addEventListener(

    "dragleave",

    () => {

        dropZone.classList.remove(
            "dragover"
        );

    }

);


dropZone.addEventListener(

    "drop",

    event => {

        event.preventDefault();

        dropZone.classList.remove(
            "dragover"
        );


        [...event.dataTransfer.files]
            .forEach(
                sendFile
            );

    }

);


// ======================================================
// COPY ROOM
// ======================================================

copyBtn.onclick =
    async () => {

        await navigator.clipboard
            .writeText(
                room
            );


        copyBtn.textContent =
            "Copied!";


        setTimeout(

            () => {

                copyBtn.textContent =
                    "Copy";

            },

            1500

        );

    };


// ======================================================
// LEAVE
// ======================================================

leaveBtn.onclick = () => {

    if (socket)
        socket.close();


    if (peer)
        peer.close();


    location.reload();

};


</script>

</body>

</html>

`;


// ======================================================
// SERVE WEBSITE
// ======================================================

app.get("/", (req, res) => {

    res.send(HTML);

});


// ======================================================
// WEBSOCKET SERVER
// ======================================================

wss.on(
    "connection",
    ws => {

        let roomCode = null;


        ws.on(
            "message",
            message => {

                try {

                    const data =
                        JSON.parse(
                            message
                        );


                    // ==========================
                    // JOIN ROOM
                    // ==========================

                    if (
                        data.type ===
                        "join"
                    ) {

                        roomCode =
                            data.room;


                        if (
                            !rooms.has(
                                roomCode
                            )
                        ) {

                            rooms.set(
                                roomCode,
                                new Set()
                            );

                        }


                        const room =
                            rooms.get(
                                roomCode
                            );


                        if (
                            room.size >= 2
                        ) {

                            ws.send(

                                JSON.stringify({

                                    type:
                                        "error",

                                    message:
                                        "Room is full."

                                })

                            );

                            return;

                        }


                        room.add(ws);


                        ws.send(

                            JSON.stringify({

                                type:
                                    "joined",

                                users:
                                    room.size

                            })

                        );


                        // Tell first user
                        // that second user joined

                        room.forEach(
                            client => {

                                if (
                                    client !== ws &&
                                    client.readyState ===
                                    WebSocket.OPEN
                                ) {

                                    client.send(

                                        JSON.stringify({

                                            type:
                                                "peer-joined"

                                        })

                                    );

                                }

                            }
                        );


                        return;

                    }


                    // ==========================
                    // WEBRTC SIGNAL
                    // ==========================

                    if (
                        data.type ===
                        "signal"
                    ) {

                        const room =
                            rooms.get(
                                roomCode
                            );


                        if (!room)
                            return;


                        room.forEach(
                            client => {

                                if (
                                    client !== ws &&
                                    client.readyState ===
                                    WebSocket.OPEN
                                ) {

                                    client.send(

                                        JSON.stringify({

                                            type:
                                                "signal",

                                            signal:
                                                data.signal

                                        })

                                    );

                                }

                            }
                        );

                    }

                }

                catch (error) {

                    console.error(
                        error
                    );

                }

            }
        );


        // ==========================
        // DISCONNECT
        // ==========================

        ws.on(
            "close",
            () => {

                if (!roomCode)
                    return;


                const room =
                    rooms.get(
                        roomCode
                    );


                if (!room)
                    return;


                room.delete(ws);


                room.forEach(
                    client => {

                        if (
                            client.readyState ===
                            WebSocket.OPEN
                        ) {

                            client.send(

                                JSON.stringify({

                                    type:
                                        "peer-left"

                                })

                            );

                        }

                    }
                );


                if (
                    room.size === 0
                ) {

                    rooms.delete(
                        roomCode
                    );

                }

            }
        );

    }
);


// ======================================================
// START SERVER
// ======================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            "        WebRTC IS RUNNING"
        );

        console.log(
            "================================="
        );

        console.log("");

        console.log(
            "Laptop:"
        );

        console.log(
            "http://localhost:" +
            PORT
        );

        console.log("");

        console.log(
            "For phone on same Wi-Fi:"
        );

        console.log(
            "Find your laptop IP and open:"
        );

        console.log(
            "http://YOUR-IP:" +
            PORT
        );

        console.log("");

        console.log(
            "Maximum file size: 100 MB"
        );

        console.log("");

    }
);
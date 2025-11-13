// Lightweight WebSocket client with subscription multiplexing

let socket = null;
let url = null;
let connected = false;
let connecting = false;
const pendingMsgs = [];
const docSubs = new Map(); // path -> Set(callback)

function getWsUrl() {
  const envUrl = (process.env.REACT_APP_WS_URL || '').trim();
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocal) return 'ws://localhost:5001';
    // default to same-origin wss on production with /ws path (optional reverse proxy)
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws`;
  }
  return 'ws://localhost:5001';
}

function ensureSocket() {
  if (socket && connected) return socket;
  if (connecting) return socket;
  url = getWsUrl();
  connecting = true;
  socket = new WebSocket(url);

  socket.onopen = () => {
    connected = true;
    connecting = false;
    // flush pending
    while (pendingMsgs.length) {
      socket.send(pendingMsgs.shift());
    }
    // resubscribe any existing paths (useful on reconnect)
    for (const path of docSubs.keys()) {
      send({ type: 'sub-doc', path });
    }
  };

  socket.onclose = () => {
    connected = false;
    connecting = false;
    // attempt simple reconnect after delay
    setTimeout(() => {
      try { ensureSocket(); } catch {}
    }, 2000);
  };

  socket.onmessage = (evt) => {
    let msg = null;
    try { msg = JSON.parse(evt.data); } catch { return; }
    if (!msg || !msg.type) return;
    if (msg.type === 'doc' && msg.path) {
      const set = docSubs.get(msg.path);
      if (set) {
        set.forEach((cb) => { try { cb(msg.data || null); } catch {} });
      }
    }
  };

  return socket;
}

function send(obj) {
  const s = JSON.stringify(obj);
  if (socket && connected) socket.send(s);
  else pendingMsgs.push(s);
}

export function subscribeDoc(path, cb) {
  ensureSocket();
  let set = docSubs.get(path);
  if (!set) {
    set = new Set();
    docSubs.set(path, set);
  }
  set.add(cb);
  if (set.size === 1) send({ type: 'sub-doc', path });
  return () => {
    const set2 = docSubs.get(path);
    if (!set2) return;
    set2.delete(cb);
    if (set2.size === 0) {
      docSubs.delete(path);
      send({ type: 'unsub-doc', path });
    }
  };
}

export function isConnected() {
  return connected;
}

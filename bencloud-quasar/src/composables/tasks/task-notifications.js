let socket = null;
let socketUrl = null;
let isConnecting = false;

// batchTaskId -> subscription count
const subscriptions = new Map();

// Simple global event bus
const bus = new EventTarget();

function getDefaultWsUrl() {
  // API_SERVER is usually http://host:4567. Websocket server runs on 8081.
  // If API_SERVER is not set, fallback to current location hostname.
  const api = (process.env.API_SERVER || "").trim();
  try {
    const u = api ? new URL(api) : null;
    const host = u ? u.hostname : window.location.hostname;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${host}:8081/ws/task-notifications/`;
  } catch (e) {
    const host = window.location.hostname;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${host}:8081/ws/task-notifications/`;
  }
}

function ensureConnected() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  if (isConnecting) return;

  isConnecting = true;
  socketUrl = socketUrl || getDefaultWsUrl();
  socket = new WebSocket(socketUrl);

  socket.onopen = () => {
    isConnecting = false;
    // Resubscribe existing subscriptions
    for (const batchTaskId of subscriptions.keys()) {
      try {
        socket.send(JSON.stringify({ action: "subscribe", batchTaskId: String(batchTaskId) }));
      } catch (e) {
        // ignore
      }
    }
    bus.dispatchEvent(new CustomEvent("ws:open"));
  };

  socket.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg?.type) {
        bus.dispatchEvent(new CustomEvent(`ws:${msg.type}`, { detail: msg }));
      }
      bus.dispatchEvent(new CustomEvent("ws:message", { detail: msg }));
    } catch (e) {
      // ignore invalid JSON
    }
  };

  socket.onclose = () => {
    isConnecting = false;
    bus.dispatchEvent(new CustomEvent("ws:close"));
    // Best-effort reconnect if we still have subscriptions
    if (subscriptions.size > 0) {
      setTimeout(() => ensureConnected(), 1500);
    }
  };

  socket.onerror = () => {
    // onclose will follow in most cases
  };
}

function subscribe(batchTaskId) {
  if (batchTaskId === null || batchTaskId === undefined) return;
  const id = String(batchTaskId);
  subscriptions.set(id, (subscriptions.get(id) || 0) + 1);
  ensureConnected();
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "subscribe", batchTaskId: id }));
  }
}

function unsubscribe(batchTaskId) {
  if (batchTaskId === null || batchTaskId === undefined) return;
  const id = String(batchTaskId);
  const next = (subscriptions.get(id) || 0) - 1;
  if (next <= 0) {
    subscriptions.delete(id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ action: "unsubscribe", batchTaskId: id }));
      } catch (e) {
        // ignore
      }
    }
  } else {
    subscriptions.set(id, next);
  }
}

function on(eventName, handler) {
  bus.addEventListener(eventName, handler);
  return () => bus.removeEventListener(eventName, handler);
}

export const taskNotifications = {
  subscribe,
  unsubscribe,
  on,
  ensureConnected,
};


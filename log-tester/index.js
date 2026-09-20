const { io } = require("socket.io-client");

// Get projectId from CLI
const projectId = process.argv[2];

if (!projectId) {
  console.log("❌ Missing project ID");
  console.log("Usage: node test-logs.js <projectId>");
  process.exit(1);
}

console.log("🚀 Starting PushCloud Log Viewer");
console.log("📁 Project:", projectId);

const socket = io("http://localhost:9002", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("🟢 Connected to WebSocket server");

  const channel = `logs:${projectId}`;
  console.log("📡 Subscribing to:", channel);

  socket.emit("subscribe", channel);
});

// SUBSCRIBE CONFIRMATION
socket.on("message", (data) => {
  // When server says: "Joined logs:XYZ"
  if (typeof data === "string" && data.startsWith("Joined")) {
    console.log("📩", data);
    return;
  }

  // Actual log data
  try {
    const parsed = JSON.parse(data);
    if (parsed.log) console.log("🔵 LOG:", parsed.log);
  } catch {
    console.log("🔵 LOG:", data);
  }
});

socket.on("disconnect", () => console.log("🔴 Disconnected"));

socket.on("connect_error", (err) =>
  console.error("❌ Connection Error:", err.message)
);

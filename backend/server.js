import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const messages = [
  {
    id: 1,
    message: "Hi! welcome to the chat app, you can send messages now.",
    sender: "Merve Reis",
    timestamp: 1,
    likes: 0,
    dislikes: 0,
  },
];
const messagesById = new Map(messages.map((msg) => [String(msg.id), msg]));
const waitingClients = [];

// Date.now() aynı milisaniyede çakışabilir, timestamp'leri tekilleştiriyoruz
let lastTimestamp = 0;
function nextTimestamp() {
  const now = Date.now();
  lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;
  return lastTimestamp;
}

function releaseWaitingClients() {
  for (const client of waitingClients) {
    clearTimeout(client.timeout);
    const messagesForClient = messages.filter(
      (msg) => msg.timestamp > client.since,
    );
    client.res.json(messagesForClient);
  }
  waitingClients.length = 0;
}

function removeWaitingClient(client) {
  const index = waitingClients.indexOf(client);
  if (index !== -1) waitingClients.splice(index, 1);
}

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: [
      "http://localhost:5501",
      "http://127.0.0.1:5501",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "",
    ],
  }),
);
app.use(express.json());

app.get("/getMessages", (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const longPoll = req.query.longPoll === "true";
  const newMessages = messages.filter((msg) => msg.timestamp > since);

  if (newMessages.length > 0) {
    res.json(newMessages);
    return;
  }

  if (!longPoll) {
    res.json([]);
    return;
  }

  // Long-polling: bağlantıyı açık tut
  const client = { res, since };

  client.timeout = setTimeout(() => {
    removeWaitingClient(client);
    res.json([]);
  }, 25000);

  req.on("close", () => {
    clearTimeout(client.timeout);
    removeWaitingClient(client);
  });

  waitingClients.push(client);
});

app.post("/sendMessage", (req, res) => {
  const { message, sender, replyTo } = req.body;
  if (message && sender) {
    const newMessage = {
      id: randomUUID(),
      message,
      sender,
      timestamp: nextTimestamp(),
      likes: 0,
      dislikes: 0,
      replyTo: replyTo || null,
    };

    messages.push(newMessage);
    messagesById.set(String(newMessage.id), newMessage);

    releaseWaitingClients();

    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ success: false, error: "Invalid message data" });
  }
});

app.post("/reactMessage", (req, res) => {
  const { id, reaction } = req.body;
  const message = messagesById.get(String(id));

  if (!message || !["like", "dislike"].includes(reaction)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid reaction request" });
  }

  if (reaction === "like") {
    message.likes += 1;
  } else {
    message.dislikes += 1;
  }

  // yeniden damgala ki diğer kullanıcıların since filtresinden geçsin
  message.timestamp = nextTimestamp();
  releaseWaitingClients();

  res.status(200).json({ success: true, message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

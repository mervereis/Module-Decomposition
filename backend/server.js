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

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: ["http://localhost:5501", "http://127.0.0.1:5500", ""],
  }),
);
app.use(express.json());

app.get("/getMessages", (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const newMessages = messages.filter((msg) => msg.timestamp > since);
  res.json(newMessages);
});

app.post("/sendMessage", (req, res) => {
  const { message, sender, replyTo } = req.body;
  if (message && sender) {
    const timestamp = Date.now();
    const newMessage = {
      id: randomUUID(),
      message,
      sender,
      timestamp,
      likes: 0,
      dislikes: 0,
      replyTo: replyTo || null,
    };

    messages.push(newMessage);
    messagesById.set(String(newMessage.id), newMessage);

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

  res.status(200).json({ success: true, message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

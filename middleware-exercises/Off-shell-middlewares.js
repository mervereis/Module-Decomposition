import express from "express";

const app = express();

function usernameMiddleware(req, res, next) {
  const username = req.get("X-Username");

  if (username) {
    req.username = username;
  } else {
    req.username = null;
  }

  next();
}

app.use(express.json());
app.use(usernameMiddleware);

app.post("/", (req, res) => {
  const subjects = req.body;

  if (req.username) {
    res.send(
      `You are authenticated as ${req.username}.\n\n` +
        `You have requested information about ${subjects.length} ` +
        `${subjects.length === 1 ? "subject" : "subjects"}` +
        `${subjects.length > 0 ? `: ${subjects.join(", ")}` : ""}.`,
    );
  } else {
    res.send(
      `You are not authenticated.\n\n` +
        `You have requested information about ${subjects.length} ` +
        `${subjects.length === 1 ? "subject" : "subjects"}` +
        `${subjects.length > 0 ? `: ${subjects.join(", ")}` : ""}.`,
    );
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

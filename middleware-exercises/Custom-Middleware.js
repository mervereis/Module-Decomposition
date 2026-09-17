const express = require("express");

const app = express();
const PORT = 3000;

// Middleware 1:check X-Username header
function usernameMiddleware(req, res, next) {
  const username = req.get("X-Username");

  if (username) {
    req.username = username;
  } else {
    req.username = null;
  }

  next();
}

// Middleware 2: parse and validate JSON array
function bodyMiddleware(req, res, next) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    try {
      const parsedBody = JSON.parse(body);

      if (!Array.isArray(parsedBody)) {
        return res.status(400).send("Request body must be a JSON array.");
      }

      if (!parsedBody.every((item) => typeof item === "string")) {
        return res.status(400).send("Array must contain only strings.");
      }

      req.body = parsedBody;
      next();
    } catch (error) {
      res.status(400).send("Request body must be valid JSON.");
    }
  });
}

app.use(usernameMiddleware);
app.use(bodyMiddleware);

app.post("/", (req, res) => {
  const subjects = req.body;

  if (req.username) {
    res.send(
      `You are authenticated as ${req.username}.\n\n` +
        `You have requested information about ${subjects.length} ` +
        `${subjects.length === 1 ? "subject" : "subjects"}` +
        `${subjects.length > 0 ? ": " + subjects.join(", ") : ""}.`,
    );
  } else {
    res.send(
      `You are not authenticated.\n\n` +
        `You have requested information about ${subjects.length} ` +
        `${subjects.length === 1 ? "subject" : "subjects"}` +
        `${subjects.length > 0 ? ": " + subjects.join(", ") : ""}.`,
    );
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

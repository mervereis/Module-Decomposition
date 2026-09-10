const appServerURL = "http://127.0.0.1:3000";

const currentUser = prompt("Enter your name:") || "Unknown";
let lastTimestamp = 0;
let displayedMessages = [];
let replyToMessage = null;

async function setup() {
  await renderMessages();

  const messageText = document.getElementById("messageText");
  const submitMessage = document.getElementById("submitMessage");
  const messagesContainer = document.querySelector(".chat-messages");
  const cancelReplyButton = document.getElementById("cancelReplyButton");
  const messageRefreshInterval = 500;

  submitMessage.addEventListener("click", async (e) => {
    e.preventDefault();
    const message = messageText.value.trim();
    if (message) {
      const success = await sendMessage(message, replyToMessage?.id);
      console.log(success);
      if (success) {
        messageText.value = "";
        clearReplyPreview();
        await renderMessages();
      } else {
        alert("Failed to send message. Please try again.");
      }
    }
  });

  cancelReplyButton.addEventListener("click", () => {
    clearReplyPreview();
  });

  messagesContainer.addEventListener("click", async (e) => {
    const likeButton = e.target.closest(".like-button");
    const dislikeButton = e.target.closest(".dislike-button");
    const replyButton = e.target.closest(".reply-button");

    if (replyButton) {
      const messageId = replyButton.dataset.id;
      handleReplyClick(messageId);
      return;
    }

    if (likeButton || dislikeButton) {
      const button = likeButton || dislikeButton;
      const messageId = button.dataset.id;
      const reaction = likeButton ? "like" : "dislike";

      const success = await reactToMessage(messageId, reaction);
      if (success) {
        await renderMessages();
      }
    }
  });

  setInterval(renderMessages, messageRefreshInterval);
}

async function renderMessages() {
  const messages = await fetchMessages(lastTimestamp);
  if (messages.length === 0) {
    return;
  }

  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    lastTimestamp = Math.max(lastTimestamp, lastMessage.timestamp);
  }

  messages.sort((a, b) => a.timestamp - b.timestamp);
  displayedMessages.push(...messages);
  appendMessages(messages);
}

function appendMessages(messages) {
  const messagesContainer = document.querySelector(".chat-messages");

  messages.forEach((message) => {
    const role = currentUser === message.sender ? "sent" : "received";

    const div = document.createElement("div");
    div.className = `message ${role}`;

    const senderName = document.createElement("span");
    senderName.className = "sender-name";
    senderName.textContent = message.sender;

    if (message.replyTo) {
      const originalMessage = displayedMessages.find(
        (m) => String(m.id) === String(message.replyTo),
      );
      const replyPreview = document.createElement("div");
      replyPreview.className = "message-reply";
      replyPreview.textContent = originalMessage
        ? `${originalMessage.sender}: ${originalMessage.message}`
        : "Replied to a message";
      div.append(replyPreview);
    }

    const text = document.createElement("p");
    text.textContent = message.message;

    const reactionRow = document.createElement("div");
    reactionRow.className = "reaction-row";

    const replyButton = document.createElement("button");
    replyButton.className = "reply-button";
    replyButton.dataset.id = message.id;
    replyButton.textContent = "Reply";

    const likeButton = document.createElement("button");
    likeButton.className = "reaction-button like-button";
    likeButton.dataset.id = message.id;
    likeButton.textContent = `👍 ${message.likes || 0}`;

    const dislikeButton = document.createElement("button");
    dislikeButton.className = "reaction-button dislike-button";
    dislikeButton.dataset.id = message.id;
    dislikeButton.textContent = `👎 ${message.dislikes || 0}`;

    if (role === "received") {
      reactionRow.append(replyButton);
    }
    reactionRow.append(likeButton, dislikeButton);

    div.append(senderName, text, reactionRow);
    messagesContainer.appendChild(div);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function fetchMessages(lastTimestamp = 0) {
  try {
    const response = await fetch(
      `${appServerURL}/getMessages?since=${lastTimestamp}`,
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
}

async function sendMessage(message, replyTo = null) {
  try {
    const response = await fetch(`${appServerURL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sender: currentUser, replyTo }),
    });
    console.log(response);

    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

function handleReplyClick(messageId) {
  const message = displayedMessages.find(
    (m) => String(m.id) === String(messageId),
  );
  if (!message) {
    return;
  }

  replyToMessage = message;
  renderReplyPreview(message);
}

function renderReplyPreview(msg) {
  const replyPreview = document.getElementById("replyPreview");
  const replyPreviewText = document.getElementById("replyPreviewText");

  if (!msg) {
    replyPreview.classList.add("hidden");
    replyPreviewText.textContent = "";
    return;
  }

  replyPreviewText.textContent = `${msg.sender}: ${msg.message}`;
  replyPreview.classList.remove("hidden");
}

function clearReplyPreview() {
  replyToMessage = null;
  renderReplyPreview(null);
}

async function reactToMessage(id, reaction) {
  try {
    const response = await fetch(`${appServerURL}/reactMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reaction }),
    });
    const data = await response.json();

    if (data.success && data.message) {
      updateMessageReaction(data.message);
    }

    return data.success;
  } catch (error) {
    return false;
  }
}

function updateMessageReaction(message) {
  const existingMessage = displayedMessages.find((m) => m.id === message.id);
  if (existingMessage) {
    Object.assign(existingMessage, message);
  }

  const likeButton = document.querySelector(
    `.like-button[data-id="${message.id}"]`,
  );
  const dislikeButton = document.querySelector(
    `.dislike-button[data-id="${message.id}"]`,
  );

  if (likeButton) {
    likeButton.textContent = `👍 ${message.likes || 0}`;
  }
  if (dislikeButton) {
    dislikeButton.textContent = `👎 ${message.dislikes || 0}`;
  }
}

window.onload = setup;

const appServerURL =
  "https://su8eirz5gisnxsdt3fg4cyvr.trainees.hosting.cyf.academy";

let currentUser = localStorage.getItem("chatUserName") || "Guest";
let lastTimestamp = 0;
let displayedMessages = [];
let replyToMessage = null;
let connectionStatus;

async function setup() {
  const messageText = document.getElementById("messageText");
  const senderName = document.getElementById("senderName");
  const submitMessage = document.getElementById("submitMessage");
  const messagesContainer = document.querySelector(".chat-messages");
  const cancelReplyButton = document.getElementById("cancelReplyButton");
  const form = document.querySelector(".chat-input-area");
  const formStatus = document.getElementById("formStatus");
  connectionStatus = document.getElementById("connectionStatus");

  senderName.value = currentUser;
  senderName.addEventListener("input", () => {
    currentUser = senderName.value.trim() || "Guest";
    localStorage.setItem("chatUserName", currentUser);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = messageText.value.trim();
    if (!message) return;

    currentUser = senderName.value.trim() || "Guest";
    localStorage.setItem("chatUserName", currentUser);
    submitMessage.disabled = true;
    formStatus.textContent = "Sending message...";

    const success = await sendMessage(message, replyToMessage?.id);
    if (success) {
      messageText.value = "";
      formStatus.textContent = "Message sent.";
      clearReplyPreview();
    } else {
      formStatus.textContent = "Message could not be sent. Please try again.";
    }
    submitMessage.disabled = false;
    messageText.focus();
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
      }
    }
  });

  pollForMessages();
}

async function pollForMessages() {
  try {
    const messages = await fetchMessages(lastTimestamp);
    if (connectionStatus) {
      connectionStatus.remove();
      connectionStatus = null;
    }

    if (messages.length > 0) {
      messages.sort((a, b) => a.timestamp - b.timestamp);

      // since filtresinin ilerlemesi için timestamp'i her zaman güncelle,
      // mesaj daha önce görülmüş (sadece reaksiyonu değişmiş) olsa bile.
      lastTimestamp = Math.max(
        lastTimestamp,
        ...messages.map((message) => message.timestamp),
      );

      const newMessages = [];
      for (const message of messages) {
        const isNew = !displayedMessages.some(
          (item) => String(item.id) === String(message.id),
        );
        if (isNew) {
          displayedMessages.push(message);
          newMessages.push(message);
        } else {
          updateMessageReaction(message);
        }
      }

      if (newMessages.length > 0) {
        appendMessages(newMessages);
      }
    }
  } catch (error) {
    if (connectionStatus) {
      connectionStatus.textContent = "Connection interrupted. Reconnecting…";
    }
    setTimeout(pollForMessages, 1000);
    return;
  }

  setTimeout(pollForMessages, 500);
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
    likeButton.setAttribute("aria-label", `Like ${message.sender}'s message. ${message.likes || 0} likes`);

    const dislikeButton = document.createElement("button");
    dislikeButton.className = "reaction-button dislike-button";
    dislikeButton.dataset.id = message.id;
    dislikeButton.textContent = `👎 ${message.dislikes || 0}`;
    dislikeButton.setAttribute("aria-label", `Dislike ${message.sender}'s message. ${message.dislikes || 0} dislikes`);

    replyButton.setAttribute("aria-label", `Reply to ${message.sender}'s message`);

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // > server's 25s hold

  try {
    const response = await fetch(
      `${appServerURL}/getMessages?since=${lastTimestamp}&longPoll=true`,
      { cache: "no-store", signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function sendMessage(message, replyTo = null) {
  try {
    const response = await fetch(`${appServerURL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sender: currentUser, replyTo }),
    });
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
    likeButton.setAttribute("aria-label", `Like ${message.sender}'s message. ${message.likes || 0} likes`);
  }
  if (dislikeButton) {
    dislikeButton.textContent = `👎 ${message.dislikes || 0}`;
    dislikeButton.setAttribute("aria-label", `Dislike ${message.sender}'s message. ${message.dislikes || 0} dislikes`);
  }
}

document.addEventListener("DOMContentLoaded", setup, { once: true });

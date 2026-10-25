
(() => {
  "use strict";

  // =====================================================
  // CONFIG
  // =====================================================

  if (
    !window.CKTSAGE_CONFIG ||
    !window.CKTSAGE_CONFIG.API_BASE
  ) {
    console.error("CKTSage backend configuration is missing.");
    alert("CKTSage configuration could not be loaded.");
    return;
  }

  const API_BASE = window.CKTSAGE_CONFIG.API_BASE;

  const AUTH_KEY = "cktsage-auth";
  const ACTIVE_CHAT_KEY = "cktsage-active-conversation";
  const PENDING_PROMPT_KEY = "cktsage-pending-prompt";

  // =====================================================
  // AUTH
  // =====================================================

  let auth = null;

  try {
    auth = JSON.parse(
      localStorage.getItem(AUTH_KEY) || "null"
    );
  } catch (error) {
    console.error("Could not read saved login:", error);
    auth = null;
  }

  // Only redirect when there is no saved authentication.
  // We do NOT automatically delete the saved login because
  // CKTSage uses persistent authentication.
  if (!auth || !auth.access_token) {
    window.location.replace("login.html");
    return;
  }

  const TOKEN = auth.access_token;

  // =====================================================
  // ELEMENTS
  // =====================================================

  const shell = document.getElementById("chat-shell");
  const thread = document.getElementById("thread");
  const form = document.getElementById("composer");
  const promptBox = document.getElementById("prompt");
  const sendButton = document.getElementById("send");
  const libraryButton = document.getElementById("library-attach");
  const recentList = document.getElementById("recent-list");
  const newChatButton = document.getElementById("new-chat");
  const sidebarToggle = document.getElementById("mobile-toggle");
  const sidebarScrim = document.getElementById("sidebar-scrim");
  const attachedLibrary = document.getElementById("attached-library");

  if (!thread || !form || !promptBox || !sendButton) {
    console.error("Chat page is missing required HTML elements.");
    return;
  }

  // =====================================================
  // STATE
  // =====================================================

  let conversations = [];
  let activeConversationId = null;
  let sending = false;

  let lastSubmittedText = "";
  let lastSubmittedTime = 0;

  // =====================================================
  // API
  // =====================================================

  async function apiFetch(path, options = {}) {
    let response;

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {})
    };

    if (
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    try {
      response = await fetch(
        `${API_BASE}${path}`,
        {
          ...options,
          headers
        }
      );
    } catch (error) {
      console.error("Backend network error:", error);

      throw new Error(
        "Cannot connect to the CKTSage backend."
      );
    }

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    // IMPORTANT:
    // Do not automatically remove cktsage-auth here.
    // The user's persistent login remains saved until
    // they manually sign out from the Profile page.
    if (response.status === 401) {
      console.error(
        "Authentication rejected by backend."
      );

      throw new Error(
        data?.detail ||
        "Authentication was rejected by the backend."
      );
    }

    if (!response.ok) {
      let detail =
        data?.detail ||
        data?.message ||
        `Backend error ${response.status}`;

      if (Array.isArray(detail)) {
        detail = detail
          .map(
            item =>
              item?.msg ||
              JSON.stringify(item)
          )
          .join(", ");
      }

      throw new Error(detail);
    }

    return data;
  }

  // =====================================================
  // HTML ESCAPING
  // =====================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =====================================================
  // CLEAN AI TEXT
  // =====================================================

  function cleanAIText(text) {
    let value = String(text ?? "");

    value = value.replace(/\r\n/g, "\n");

    value = value.replace(
      /\\[ \t]*\n/g,
      "\n"
    );

    value = value.replace(
      /\\([#*|>`~\-])/g,
      "$1"
    );

    value = value.replace(
      /\n{4,}/g,
      "\n\n\n"
    );

    return value.trim();
  }

  // =====================================================
  // PROTECT MATH
  // =====================================================

  function protectMath(text) {
    const mathBlocks = [];

    function storeMath(value) {
      const index = mathBlocks.length;

      mathBlocks.push(value);

      return `@@CKTSAGE_MATH_${index}@@`;
    }

    text = text.replace(
      /\$\$([\s\S]*?)\$\$/g,
      match => storeMath(match)
    );

    text = text.replace(
      /\\\[([\s\S]*?)\\\]/g,
      match => storeMath(match)
    );

    text = text.replace(
      /\\\(([\s\S]*?)\\\)/g,
      match => storeMath(match)
    );

    text = text.replace(
      /\$([^$\n]+?)\$/g,
      match => storeMath(match)
    );

    return {
      text,
      mathBlocks
    };
  }

  // =====================================================
  // RESTORE MATH
  // =====================================================

  function restoreMath(html, mathBlocks) {
    return html.replace(
      /@@CKTSAGE_MATH_(\d+)@@/g,
      (match, index) => {
        const value =
          mathBlocks[Number(index)];

        if (value === undefined) {
          return match;
        }

        return escapeHtml(value);
      }
    );
  }

  // =====================================================
  // INLINE MARKDOWN
  // =====================================================

  function renderInlineMarkdown(text) {
    let value = escapeHtml(text);

    const codeBlocks = [];

    value = value.replace(
      /`([^`\n]+)`/g,
      (match, code) => {
        const index = codeBlocks.length;

        codeBlocks.push(
          `<code>${code}</code>`
        );

        return `@@CKTSAGE_CODE_${index}@@`;
      }
    );

    value = value.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (match, label, url) => {
        return (
          `<a href="${url}" ` +
          `target="_blank" ` +
          `rel="noopener noreferrer">` +
          `${label}</a>`
        );
      }
    );

    value = value.replace(
      /\*\*([^*\n]+)\*\*/g,
      "<strong>$1</strong>"
    );

    value = value.replace(
      /(^|[^*])\*([^*\n]+)\*/g,
      "$1<em>$2</em>"
    );

    value = value.replace(
      /@@CKTSAGE_CODE_(\d+)@@/g,
      (match, index) => {
        return (
          codeBlocks[Number(index)] || ""
        );
      }
    );

    return value;
  }

  // =====================================================
  // TABLE HELPERS
  // =====================================================

  function isTableSeparator(line) {
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(cell => cell.trim());

    if (!cells.length) {
      return false;
    }

    return cells.every(
      cell => /^:?-{3,}:?$/.test(cell)
    );
  }

  function parseTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(cell => cell.trim());
  }

  function renderTable(lines, startIndex) {
    const headerCells =
      parseTableRow(lines[startIndex]);

    const rows = [];

    let index = startIndex + 2;

    while (
      index < lines.length &&
      lines[index].includes("|") &&
      lines[index].trim() !== ""
    ) {
      rows.push(
        parseTableRow(lines[index])
      );

      index += 1;
    }

    let html =
      '<div class="markdown-table-wrap">' +
      '<table class="markdown-table">';

    html += "<thead><tr>";

    headerCells.forEach(cell => {
      html +=
        `<th>${renderInlineMarkdown(cell)}</th>`;
    });

    html += "</tr></thead>";

    if (rows.length) {
      html += "<tbody>";

      rows.forEach(row => {
        html += "<tr>";

        headerCells.forEach(
          (unused, cellIndex) => {
            html +=
              `<td>${renderInlineMarkdown(
                row[cellIndex] || ""
              )}</td>`;
          }
        );

        html += "</tr>";
      });

      html += "</tbody>";
    }

    html += "</table></div>";

    return {
      html,
      nextIndex: index
    };
  }

  // =====================================================
  // MARKDOWN RENDERER
  // =====================================================

  function renderMarkdown(input) {
    const cleaned =
      cleanAIText(input);

    const protectedData =
      protectMath(cleaned);

    const lines =
      protectedData.text.split("\n");

    let html = "";
    let index = 0;

    let unorderedListOpen = false;
    let orderedListOpen = false;

    function closeLists() {
      if (unorderedListOpen) {
        html += "</ul>";
        unorderedListOpen = false;
      }

      if (orderedListOpen) {
        html += "</ol>";
        orderedListOpen = false;
      }
    }

    while (index < lines.length) {
      const rawLine = lines[index];
      const line = rawLine.trim();

      if (!line) {
        closeLists();
        index += 1;
        continue;
      }

      if (line.startsWith("```")) {
        closeLists();

        const language =
          line.slice(3).trim();

        const codeLines = [];

        index += 1;

        while (
          index < lines.length &&
          !lines[index]
            .trim()
            .startsWith("```")
        ) {
          codeLines.push(
            lines[index]
          );

          index += 1;
        }

        if (index < lines.length) {
          index += 1;
        }

        html +=
          `<pre class="markdown-code-block">` +
          `<code data-language="${escapeHtml(
            language
          )}">` +
          `${escapeHtml(
            codeLines.join("\n")
          )}` +
          `</code></pre>`;

        continue;
      }

      if (
        /^@@CKTSAGE_MATH_\d+@@$/.test(line)
      ) {
        closeLists();

        const mathIndex =
          Number(
            line.match(/\d+/)[0]
          );

        const mathValue =
          protectedData.mathBlocks[
            mathIndex
          ] || "";

        const isDisplay =
          mathValue.startsWith("$$") ||
          mathValue.startsWith("\\[");

        if (isDisplay) {
          html +=
            `<div class="math-block">` +
            `${escapeHtml(mathValue)}` +
            `</div>`;
        } else {
          html +=
            `<p>${escapeHtml(
              mathValue
            )}</p>`;
        }

        index += 1;
        continue;
      }

      if (
        line.includes("|") &&
        index + 1 < lines.length &&
        isTableSeparator(
          lines[index + 1]
        )
      ) {
        closeLists();

        const table =
          renderTable(
            lines,
            index
          );

        html += table.html;
        index = table.nextIndex;

        continue;
      }

      const heading =
        line.match(
          /^(#{1,6})\s+(.+)$/
        );

      if (heading) {
        closeLists();

        const level =
          heading[1].length;

        html +=
          `<h${level}>` +
          `${renderInlineMarkdown(
            heading[2]
          )}` +
          `</h${level}>`;

        index += 1;
        continue;
      }

      if (
        /^(-{3,}|\*{3,}|_{3,})$/.test(line)
      ) {
        closeLists();

        html += "<hr>";

        index += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeLists();

        html +=
          "<blockquote>" +
          renderInlineMarkdown(
            line.replace(/^>\s?/, "")
          ) +
          "</blockquote>";

        index += 1;
        continue;
      }

      const unordered =
        line.match(
          /^[-*+]\s+(.+)$/
        );

      if (unordered) {
        if (orderedListOpen) {
          html += "</ol>";
          orderedListOpen = false;
        }

        if (!unorderedListOpen) {
          html += "<ul>";
          unorderedListOpen = true;
        }

        html +=
          "<li>" +
          renderInlineMarkdown(
            unordered[1]
          ) +
          "</li>";

        index += 1;
        continue;
      }

      const ordered =
        line.match(
          /^\d+\.\s+(.+)$/
        );

      if (ordered) {
        if (unorderedListOpen) {
          html += "</ul>";
          unorderedListOpen = false;
        }

        if (!orderedListOpen) {
          html += "<ol>";
          orderedListOpen = true;
        }

        html +=
          "<li>" +
          renderInlineMarkdown(
            ordered[1]
          ) +
          "</li>";

        index += 1;
        continue;
      }

      closeLists();

      const paragraphLines = [
        line
      ];

      index += 1;

      while (index < lines.length) {
        const next =
          lines[index].trim();

        if (!next) {
          break;
        }

        if (
          next.startsWith("```")
        ) {
          break;
        }

        if (
          /^@@CKTSAGE_MATH_\d+@@$/.test(
            next
          )
        ) {
          break;
        }

        if (
          /^(#{1,6})\s+/.test(next)
        ) {
          break;
        }

        if (
          /^[-*+]\s+/.test(next)
        ) {
          break;
        }

        if (
          /^\d+\.\s+/.test(next)
        ) {
          break;
        }

        if (
          /^>\s?/.test(next)
        ) {
          break;
        }

        if (
          /^(-{3,}|\*{3,}|_{3,})$/.test(
            next
          )
        ) {
          break;
        }

        if (
          next.includes("|") &&
          index + 1 < lines.length &&
          isTableSeparator(
            lines[index + 1]
          )
        ) {
          break;
        }

        paragraphLines.push(next);

        index += 1;
      }

      html +=
        "<p>" +
        renderInlineMarkdown(
          paragraphLines.join(" ")
        ) +
        "</p>";
    }

    closeLists();

    html =
      restoreMath(
        html,
        protectedData.mathBlocks
      );

    return html;
  }

  // =====================================================
  // MATHJAX
  // =====================================================

  async function typesetMath(element) {
    if (!element) {
      return;
    }

    try {
      if (
        window.MathJax?.startup?.promise
      ) {
        await window.MathJax.startup.promise;
      }

      if (
        typeof window.MathJax?.typesetPromise !==
        "function"
      ) {
        return;
      }

      if (
        typeof window.MathJax?.typesetClear ===
        "function"
      ) {
        window.MathJax.typesetClear(
          [element]
        );
      }

      await window.MathJax.typesetPromise(
        [element]
      );
    } catch (error) {
      console.error(
        "MathJax error:",
        error
      );
    }
  }

  // =====================================================
  // SCROLL
  // =====================================================

  function scrollToBottom() {
    requestAnimationFrame(() => {
      thread.scrollTop =
        thread.scrollHeight;
    });
  }

  // =====================================================
  // WELCOME
  // =====================================================

  function showWelcome() {
    thread.innerHTML = `
      <div
        class="welcome"
        id="welcome"
      >
        <span class="welcome-spark">
          ϟ
        </span>

        <h1>
          What are we building today?
        </h1>

        <p>
          Ask about circuits, components,
          calculations, or troubleshooting.
        </p>
      </div>
    `;
  }

  // =====================================================
  // ADD MESSAGE
  // =====================================================

  function addMessage(role, text) {
    document
      .getElementById("welcome")
      ?.remove();

    const row =
      document.createElement("article");

    row.className =
      `message ${role}`;

    const avatar =
      document.createElement("div");

    avatar.className =
      "avatar";

    avatar.textContent =
      role === "user"
        ? "You"
        : "ϟ";

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    if (role === "assistant") {
      content.classList.add(
        "markdown-content"
      );

      content.innerHTML =
        renderMarkdown(text);
    } else {
      content.textContent =
        text;
    }

    row.append(
      avatar,
      content
    );

    thread.appendChild(row);

    scrollToBottom();

    if (role === "assistant") {
      typesetMath(content).then(
        () => {
          scrollToBottom();
        }
      );
    }

    return row;
  }

  // =====================================================
  // THINKING
  // =====================================================

  function addThinkingMessage() {
    document
      .getElementById("welcome")
      ?.remove();

    removeThinkingMessage();

    const row =
      document.createElement("article");

    row.id =
      "ai-thinking-message";

    row.className =
      "message assistant";

    row.innerHTML = `
      <div class="avatar">
        ϟ
      </div>

      <div class="message-content">
        Thinking…
      </div>
    `;

    thread.appendChild(row);

    scrollToBottom();
  }

  function removeThinkingMessage() {
    document
      .getElementById(
        "ai-thinking-message"
      )
      ?.remove();
  }

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  async function loadConversations() {
    try {
      const data =
        await apiFetch(
          "/conversations"
        );

      conversations =
        Array.isArray(data)
          ? data
          : [];

      renderRecents();
    } catch (error) {
      console.error(
        "Load conversations error:",
        error
      );

      if (recentList) {
        recentList.innerHTML =
          `<p class="recent-empty">${escapeHtml(
            error.message
          )}</p>`;
      }
    }
  }

  // =====================================================
  // RECENTS
  // =====================================================

  function renderRecents() {
    if (!recentList) {
      return;
    }

    recentList.innerHTML = "";

    if (!conversations.length) {
      recentList.innerHTML = `
        <p class="recent-empty">
          Your recent questions will appear here.
        </p>
      `;

      return;
    }

    conversations.forEach(
      conversation => {
        const row =
          document.createElement("div");

        row.className =
          "recent-item-row";

        const openButton =
          document.createElement("button");

        openButton.type =
          "button";

        openButton.className =
          "recent-item";

        openButton.textContent =
          conversation.title ||
          "New conversation";

        if (
          Number(
            conversation.conversation_id
          ) ===
          Number(
            activeConversationId
          )
        ) {
          openButton.classList.add(
            "active"
          );
        }

        openButton.addEventListener(
          "click",
          () => {
            openConversation(
              conversation.conversation_id
            );
          }
        );

        const deleteButton =
          document.createElement("button");

        deleteButton.type =
          "button";

        deleteButton.className =
          "recent-delete";

        deleteButton.textContent =
          "×";

        deleteButton.addEventListener(
          "click",
          event => {
            event.preventDefault();
            event.stopPropagation();

            deleteConversation(
              conversation.conversation_id
            );
          }
        );

        row.append(
          openButton,
          deleteButton
        );

        recentList.appendChild(row);
      }
    );
  }

  // =====================================================
  // CREATE CONVERSATION
  // =====================================================

  async function createConversation(
    titleText
  ) {
    let title =
      String(
        titleText ||
        "New conversation"
      ).trim();

    if (!title) {
      title =
        "New conversation";
    }

    if (title.length > 42) {
      title =
        title.slice(0, 39) +
        "...";
    }

    const conversation =
      await apiFetch(
        "/conversations",
        {
          method: "POST",

          body: JSON.stringify({
            title
          })
        }
      );

    if (
      !conversation ||
      !conversation.conversation_id
    ) {
      throw new Error(
        "Conversation was not created."
      );
    }

    activeConversationId =
      Number(
        conversation.conversation_id
      );

    localStorage.setItem(
      ACTIVE_CHAT_KEY,
      String(activeConversationId)
    );

    if (
      !conversations.some(
        item =>
          Number(
            item.conversation_id
          ) ===
          activeConversationId
      )
    ) {
      conversations.unshift(
        conversation
      );
    }

    renderRecents();

    return conversation;
  }

  // =====================================================
  // SAVE MESSAGE
  // =====================================================

  async function saveMessage(
    conversationId,
    role,
    content
  ) {
    return apiFetch(
      `/conversations/${conversationId}/messages`,
      {
        method: "POST",

        body: JSON.stringify({
          role,
          content
        })
      }
    );
  }

  // =====================================================
  // ASK AI
  // =====================================================

  async function askAI(
    conversationId,
    message
  ) {
    return apiFetch(
      `/conversations/${conversationId}/ai`,
      {
        method: "POST",

        body: JSON.stringify({
          message
        })
      }
    );
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage(rawText) {
    const text =
      String(
        rawText || ""
      ).trim();

    if (!text) {
      return;
    }

    if (sending) {
      return;
    }

    const now =
      Date.now();

    if (
      text === lastSubmittedText &&
      now - lastSubmittedTime < 1500
    ) {
      return;
    }

    lastSubmittedText =
      text;

    lastSubmittedTime =
      now;

    sending =
      true;

    sendButton.disabled =
      true;

    addMessage(
      "user",
      text
    );

    promptBox.value =
      "";

    promptBox.style.height =
      "auto";

    addThinkingMessage();

    try {
      if (!activeConversationId) {
        await createConversation(
          text
        );
      }

      await saveMessage(
        activeConversationId,
        "user",
        text
      );

      const result =
        await askAI(
          activeConversationId,
          text
        );

      removeThinkingMessage();

      const reply =
        String(
          result?.reply || ""
        ).trim();

      if (!reply) {
        throw new Error(
          "AI returned no response."
        );
      }

      addMessage(
        "assistant",
        reply
      );

      await saveMessage(
        activeConversationId,
        "assistant",
        reply
      );

      await loadConversations();

      await loadAttachedLibrary();

    } catch (error) {
      removeThinkingMessage();

      console.error(
        "Send message error:",
        error
      );

      addMessage(
        "assistant",
        error?.message ||
        "The message could not be sent."
      );
    } finally {
      sending =
        false;

      sendButton.disabled =
        false;

      promptBox.focus();
    }
  }

  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  async function openConversation(
    conversationId
  ) {
    const id =
      Number(conversationId);

    if (!id) {
      return;
    }

    activeConversationId =
      id;

    localStorage.setItem(
      ACTIVE_CHAT_KEY,
      String(id)
    );

    thread.innerHTML = "";

    try {
      const messages =
        await apiFetch(
          `/conversations/${id}/messages`
        );

      if (
        !Array.isArray(messages) ||
        !messages.length
      ) {
        showWelcome();
      } else {
        for (
          const message
          of messages
        ) {
          addMessage(
            message.role,
            message.content
          );
        }
      }

      await loadAttachedLibrary();

      renderRecents();

      shell?.classList.remove(
        "sidebar-open"
      );

      scrollToBottom();
    } catch (error) {
      console.error(
        "Open conversation error:",
        error
      );

      addMessage(
        "assistant",
        error?.message ||
        "Could not load this conversation."
      );
    }
  }

  // =====================================================
  // DELETE CONVERSATION
  // =====================================================

  async function deleteConversation(
    conversationId
  ) {
    const conversation =
      conversations.find(
        item =>
          Number(
            item.conversation_id
          ) ===
          Number(
            conversationId
          )
      );

    const title =
      conversation?.title ||
      "this chat";

    if (
      !window.confirm(
        `Delete "${title}" permanently?`
      )
    ) {
      return;
    }

    try {
      await apiFetch(
        `/conversations/${conversationId}`,
        {
          method: "DELETE"
        }
      );

      conversations =
        conversations.filter(
          item =>
            Number(
              item.conversation_id
            ) !==
            Number(
              conversationId
            )
        );

      if (
        Number(
          activeConversationId
        ) ===
        Number(
          conversationId
        )
      ) {
        activeConversationId =
          null;

        localStorage.removeItem(
          ACTIVE_CHAT_KEY
        );

        showWelcome();
      }

      renderRecents();
    } catch (error) {
      alert(
        error?.message ||
        "Could not delete chat."
      );
    }
  }

  // =====================================================
  // LIBRARY
  // =====================================================

  async function loadAttachedLibrary() {
    if (!attachedLibrary) {
      return;
    }

    if (!activeConversationId) {
      attachedLibrary.hidden =
        true;

      attachedLibrary.innerHTML =
        "";

      return;
    }

    try {
      const items =
        await apiFetch(
          `/conversations/${activeConversationId}/library`
        );

      attachedLibrary.innerHTML =
        "";

      if (
        !Array.isArray(items) ||
        !items.length
      ) {
        attachedLibrary.hidden =
          true;

        return;
      }

      attachedLibrary.hidden =
        false;

      const label =
        document.createElement("span");

      label.className =
        "attached-library-label";

      label.textContent =
        "Using:";

      attachedLibrary.appendChild(
        label
      );

      items.forEach(item => {
        const chip =
          document.createElement("span");

        chip.className =
          "attached-library-chip";

        const name =
          document.createElement("span");

        name.textContent =
          item.file_name ||
          item.title ||
          "Library item";

        const remove =
          document.createElement("button");

        remove.type =
          "button";

        remove.textContent =
          "×";

        remove.addEventListener(
          "click",
          async () => {
            await removeLibraryItem(
              item.library_item_id
            );
          }
        );

        chip.append(
          name,
          remove
        );

        attachedLibrary.appendChild(
          chip
        );
      });
    } catch (error) {
      console.error(
        "Could not load attached Library:",
        error
      );
    }
  }

  async function removeLibraryItem(
    libraryItemId
  ) {
    if (!activeConversationId) {
      return;
    }

    try {
      await apiFetch(
        `/conversations/${activeConversationId}/library/${libraryItemId}`,
        {
          method: "DELETE"
        }
      );

      await loadAttachedLibrary();
    } catch (error) {
      alert(
        error?.message ||
        "Could not remove Library item."
      );
    }
  }

  libraryButton?.addEventListener(
    "click",
    async () => {
      try {
        if (!activeConversationId) {
          await createConversation(
            "New conversation"
          );
        }

        window.location.href =
          "library.html";
      } catch (error) {
        alert(
          error?.message ||
          "Could not open Library."
        );
      }
    }
  );

  // =====================================================
  // NEW CHAT
  // =====================================================

  function newChat() {
    activeConversationId =
      null;

    localStorage.removeItem(
      ACTIVE_CHAT_KEY
    );

    if (attachedLibrary) {
      attachedLibrary.hidden =
        true;

      attachedLibrary.innerHTML =
        "";
    }

    lastSubmittedText =
      "";

    lastSubmittedTime =
      0;

    showWelcome();

    promptBox.value =
      "";

    promptBox.style.height =
      "auto";

    promptBox.focus();

    renderRecents();

    shell?.classList.remove(
      "sidebar-open"
    );
  }

  newChatButton?.addEventListener(
    "click",
    newChat
  );

  // =====================================================
  // FORM SUBMIT
  // =====================================================

  form.addEventListener(
    "submit",
    event => {
      event.preventDefault();

      sendMessage(
        promptBox.value
      );
    }
  );

  // =====================================================
  // ENTER SEND
  // =====================================================

  promptBox.addEventListener(
    "keydown",
    event => {
      if (
        event.key !== "Enter"
      ) {
        return;
      }

      if (event.shiftKey) {
        return;
      }

      if (event.isComposing) {
        return;
      }

      event.preventDefault();

      if (event.repeat) {
        return;
      }

      if (
        typeof form.requestSubmit ===
        "function"
      ) {
        form.requestSubmit();
      } else {
        sendMessage(
          promptBox.value
        );
      }
    }
  );

  // =====================================================
  // PASTE
  // =====================================================

  promptBox.addEventListener(
    "paste",
    () => {
      setTimeout(
        () => {
          promptBox.style.height =
            "auto";

          promptBox.style.height =
            `${Math.min(
              promptBox.scrollHeight,
              160
            )}px`;
        },
        0
      );
    }
  );

  // =====================================================
  // TEXTAREA HEIGHT
  // =====================================================

  promptBox.addEventListener(
    "input",
    () => {
      promptBox.style.height =
        "auto";

      promptBox.style.height =
        `${Math.min(
          promptBox.scrollHeight,
          160
        )}px`;
    }
  );

  // =====================================================
  // SIDEBAR
  // =====================================================

  sidebarToggle?.addEventListener(
    "click",
    () => {
      const mobile =
        window.matchMedia(
          "(max-width: 760px)"
        ).matches;

      if (mobile) {
        shell?.classList.toggle(
          "sidebar-open"
        );
      } else {
        shell?.classList.toggle(
          "sidebar-collapsed"
        );
      }
    }
  );

  sidebarScrim?.addEventListener(
    "click",
    () => {
      shell?.classList.remove(
        "sidebar-open"
      );
    }
  );

  // =====================================================
  // RECEIVE PROMPT FROM INDEX
  // =====================================================

  async function handleIncomingPrompt() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    let incomingPrompt =
      params.get("prompt");

    if (!incomingPrompt) {
      incomingPrompt =
        localStorage.getItem(
          PENDING_PROMPT_KEY
        );
    }

    if (
      !incomingPrompt ||
      !incomingPrompt.trim()
    ) {
      return;
    }

    const cleanPrompt =
      incomingPrompt.trim();

    localStorage.removeItem(
      PENDING_PROMPT_KEY
    );

    try {
      history.replaceState(
        null,
        "",
        "chat.html"
      );
    } catch (error) {
      console.warn(
        "Could not clean chat URL:",
        error
      );
    }

    promptBox.value =
      cleanPrompt;

    await sendMessage(
      cleanPrompt
    );
  }

  // =====================================================
  // START
  // =====================================================

  async function start() {
    showWelcome();

    try {
      await loadConversations();

      const savedId =
        Number(
          localStorage.getItem(
            ACTIVE_CHAT_KEY
          )
        );

      if (
        savedId > 0 &&
        conversations.some(
          item =>
            Number(
              item.conversation_id
            ) ===
            savedId
        )
      ) {
        await openConversation(
          savedId
        );
      } else {
        activeConversationId =
          null;

        localStorage.removeItem(
          ACTIVE_CHAT_KEY
        );
      }

      await handleIncomingPrompt();
    } catch (error) {
      console.error(
        "Chat startup error:",
        error
      );
    } finally {
      promptBox.focus();
    }
  }

  start();
})();

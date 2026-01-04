// ================================
// main.js（コメントあり）
// ================================

window.addEventListener("load", () => {
  const socket = io();
  window.socket = socket;

  socket.on("banned", () => {
    window.location.href = "/ban.html";
  });

  // ================================
  // 管理UI
  // ================================
  let adminBtn;
  let adminWindow;
  let adminContent;

  function setupAdminUI() {
    adminBtn = document.createElement("button");
    adminBtn.id = "admin-button";
    adminBtn.textContent = "管理";
    adminBtn.style.position = "fixed";
    adminBtn.style.right = "10px";
    adminBtn.style.top = "50%";
    adminBtn.style.transform = "translateY(-50%)";
    adminBtn.style.padding = "10px 20px";
    adminBtn.style.background = "#ff4444";
    adminBtn.style.color = "#fff";
    adminBtn.style.border = "none";
    adminBtn.style.borderRadius = "8px";
    adminBtn.style.cursor = "pointer";
    adminBtn.style.display = "none";
    document.body.appendChild(adminBtn);

    // ---- 管理ウィンドウ ----
    adminWindow = document.createElement("div");
    adminWindow.id = "admin-window";
    adminWindow.style.position = "fixed";
    adminWindow.style.left = "150px";
    adminWindow.style.top = "100px";
    adminWindow.style.width = "300px";
    adminWindow.style.height = "300px";
    adminWindow.style.background = "#222";
    adminWindow.style.color = "#fff";
    adminWindow.style.border = "2px solid #ff4444";
    adminWindow.style.borderRadius = "10px";
    adminWindow.style.resize = "both";
    adminWindow.style.overflow = "auto";
    adminWindow.style.display = "none";
    document.body.appendChild(adminWindow);

    // ---- タイトル（ドラッグバー） ----
    const dragBar = document.createElement("div");
    dragBar.style.width = "100%";
    dragBar.style.height = "25px";
    dragBar.style.cursor = "move";
    dragBar.style.background = "#333";
    dragBar.style.borderBottom = "1px solid #555";
    dragBar.style.borderTopLeftRadius = "8px";
    dragBar.style.borderTopRightRadius = "8px";
    dragBar.style.display = "flex";
    dragBar.style.alignItems = "center";
    dragBar.style.paddingLeft = "10px";
    dragBar.textContent = "管理ウィンドウ";
    adminWindow.appendChild(dragBar);

    // ---- コンテンツ ----
    adminContent = document.createElement("div");
    adminContent.style.padding = "10px";
    adminWindow.appendChild(adminContent);

    // ★★★ BAN + BAN解除 全部ここに統合 ★★★
    adminContent.innerHTML = `
      <h3>一時BAN</h3>
      <input id="ban-name-input" type="text" placeholder="名前をBAN" style="width: 100%; padding: 4px;">
      <button id="ban-exec-btn" style="margin-top:8px; padding:6px; width:100%;">BAN実行</button>

      <h3 style="margin-top:20px;">BAN解除</h3>
      <input id="unban-name-input" type="text" placeholder="解除する名前" style="width: 100%; padding: 4px;">
      <button id="unban-exec-btn" style="margin-top:8px; padding:6px; width:100%;">BAN解除</button>

      <p style="margin-top:10px; font-size:12px; opacity:.6;">※ デプロイまで有効</p>
    `;

    adminBtn.addEventListener("click", () => {
      adminWindow.style.display =
        adminWindow.style.display === "none" ? "block" : "none";
    });

    // ---- ドラッグ機能 ----
    let drag = false;
    let offsetX = 0;
    let offsetY = 0;

    dragBar.addEventListener("mousedown", (e) => {
      drag = true;
      offsetX = e.clientX - adminWindow.getBoundingClientRect().left;
      offsetY = e.clientY - adminWindow.getBoundingClientRect().top;
    });

    document.addEventListener("mouseup", () => (drag = false));

    document.addEventListener("mousemove", (e) => {
      if (!drag) return;
      adminWindow.style.left = e.clientX - offsetX + "px";
      adminWindow.style.top = e.clientY - offsetY + "px";
    });

    // ---- BAN実行 ----
    document.getElementById("ban-exec-btn").addEventListener("click", () => {
      const target = document.getElementById("ban-name-input").value.trim();
      if (!target) return;
      socket.emit("tempBanAdd", target);
    });

    // ---- BAN解除 ----
    document.getElementById("unban-exec-btn").addEventListener("click", () => {
      const target = document.getElementById("unban-name-input").value.trim();
      if (!target) return;
      socket.emit("tempBanRemove", target);
    });
  }

  function showAdminButton() {
    adminBtn.style.display = "block";
  }

  setupAdminUI();

  // ================================
  // UI要素
  // ================================
  const chatLog = document.getElementById("chat-log");
  const chatInput = document.getElementById("chat-input");
  const nameInput = document.getElementById("name-input");
  const sendBtn = document.getElementById("send-btn");
  const adminPassInput = document.getElementById("admin-pass");
  const colorPicker = document.getElementById("name-color-picker");
  const usersList = document.getElementById("users-list");
  const adminNotice = document.getElementById("admin-notice");
  const clearLogsBtn = document.getElementById("clear-logs");

  let isAdmin = false;
  let nameColor = "#000000";

  // ================================
  // Cookie管理
  // ================================
  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
  }
  function getCookie(name) {
    const cookies = document.cookie.split(";");
    for (let c of cookies) {
      const [k, v] = c.trim().split("=");
      if (k === name) return v;
    }
    return "";
  }

  // ---- 管理者ログイン状態復元 ----
  if (getCookie("adminlogin") === "ok") {
    isAdmin = true;
    showAdminButton();
  }

  // ---- 名前復元 ----
  const savedName = getCookie("chat-name") || "名無し";
  nameInput.value = savedName;

  // ---- 色復元 ----
  const savedColor = localStorage.getItem("name-color");
  if (savedColor) {
    nameColor = savedColor;
    colorPicker.value = savedColor;
  }

  // ================================
  // Socket接続時
  // ================================
  socket.on("connect", () => {
    socket.emit("register-name", savedName);
    socket.emit("requestUsers");
  });

  // ---- 名前変更 ----
  nameInput.addEventListener("input", () => {
    const newName = nameInput.value.trim() || "名無し";
    setCookie("chat-name", newName, 30);
    socket.emit("setName", newName);
  });

  // ---- 色変更 ----
  colorPicker.addEventListener("input", () => {
    nameColor = colorPicker.value;
    localStorage.setItem("name-color", nameColor);
  });

  // ================================
  // 管理者認証
  // ================================
  adminPassInput.addEventListener("input", async () => {
    const pass = adminPassInput.value.trim();
    if (!pass) {
      isAdmin = false;
      return;
    }

    try {
      const res = await fetch("/auth-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });

      const json = await res.json();
      isAdmin = json.ok;

      if (isAdmin) {
        setCookie("adminlogin", "ok", 3);

        adminNotice.classList.remove("hidden");
        setTimeout(() => adminNotice.classList.add("hidden"), 3000);

        showAdminButton();
      }
    } catch {}
  });

  // ================================
  // チャット送信
  // ================================
  function sendMessage() {
    const msg = chatInput.value.trim();
    const name = nameInput.value.trim() || "名無し";
    if (!msg) return;

    socket.emit("chat", { name, msg, isAdmin, color: nameColor });
    chatInput.value = "";
  }

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ================================
  // ログ削除
  // ================================
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      chatLog.innerHTML = "";
    });
  }

  // ================================
  // ユーザー一覧
  // ================================
  socket.on("updateUsers", (users) => {
    usersList.innerHTML = "";
    users.forEach((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      usersList.appendChild(li);
    });
  });

  // ================================
  // チャット受信
  // ================================
  socket.on("chat", ({ name, msg, isAdmin, color }) => {
    const p = document.createElement("p");
    p.classList.add("message");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = name;
    if (isAdmin) nameSpan.classList.add("admin-name");

    const msgSpan = document.createElement("span");
    msgSpan.textContent = ": " + msg;
    msgSpan.style.color = color || "#000";

    p.appendChild(nameSpan);
    p.appendChild(msgSpan);

    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
  });

  // ================================
  // 入退室
  // ================================
  socket.on("join", (name) => {
    const p = document.createElement("p");
    p.classList.add("message");
    p.innerHTML = `✅ <i>${name}</i> が入室しました`;
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
  });

  socket.on("leave", (name) => {
    const p = document.createElement("p");
    p.classList.add("message");
    p.innerHTML = `👋 <i>${name}</i> が退出しました`;
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
  });

  window.addEventListener("beforeunload", () => {
    const name = nameInput.value.trim() || "名無し";
    socket.emit("leave", name);
  });
});

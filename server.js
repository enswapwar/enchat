const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", true);
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// データ

let users = {}; 
let tempBan = [];        // 名前ベースの一時BAN
let adminPassList = [];  // admin パスワード一覧

// ipbanlist 読み込み

function loadIPBan() {
  try {
    const data = fs.readFileSync(path.join(__dirname, "ipbanlist"), "utf8");
    return data.split("\n").map(v => v.trim()).filter(v => v);
  } catch {
    console.log("⚠ ipbanlist が読み込めないぞい");
    return [];
  }
}


// 起動時に ipbanlist の中身を全部表示

function printIPBanOnStart() {
  const banned = loadIPBan();
  console.log(" IP BAN リスト ");
  
  if (banned.length === 0) {
    console.log("該当なし");
  } else {
    banned.forEach(ip => console.log(`- ${ip}`));
  }

  console.log("=======================================");
}
printIPBanOnStart();


// adminpassword 読み込み
function loadAdminPass() {
  try {
    const data = fs.readFileSync(
      path.join(__dirname, "programfile/adminpassword"),
      "utf8"
    );
    return data.split("\n").map(v => v.trim()).filter(v => v);
  } catch {
    console.log("⚠ adminpassword が読み込めないぞい");
    return [];
  }
}
adminPassList = loadAdminPass();


// 静的ファイル
app.use("/programfile", express.static(path.join(__dirname, "programfile")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/ban.html", (req, res) => {
  res.sendFile(path.join(__dirname, "ban.html"));
});


　
// 管理パスワード API
　
app.post("/auth-admin", (req, res) => {
  const pass = req.body.password;
  if (!pass) return res.json({ ok: false });

  adminPassList = loadAdminPass(); // ホットリロード

  const ok = adminPassList.includes(pass);
  res.json({ ok });
});


　
// ソケット
　
io.on("connection", (socket) => {

  // --- IP 取得 ---
  const bannedIPs = loadIPBan();
  let ip =
    socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    socket.handshake.address;

  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
  if (ip === "::1") ip = "127.0.0.1";

  // --- IP BAN ---
  if (bannedIPs.includes(ip)) {
    console.log(`⛔ BANされた IP が接続: ${ip}`);
    socket.emit("banned");
    return socket.disconnect(true);
  }

  console.log(`🟢 接続: ${socket.id}  IP: ${ip}`);

  users[socket.id] = "名無し";
  broadcastUsers();

  　
  // 名前登録
  　
  socket.on("register-name", (name) => {
    const n = name || "名無し";

    if (tempBan.includes(n)) {
      console.log(`⛔ 一時 BAN 名前: ${n}  IP: ${ip}`);
      socket.emit("banned");
      return socket.disconnect(true);
    }

    users[socket.id] = n;
    io.emit("join", n);
    broadcastUsers();
  });

  　
  // 名前変更
  　
  socket.on("setName", (name) => {
    const after = name?.trim() || "名無し";

    if (tempBan.includes(after)) {
      console.log(`⛔ 一時 BAN 名前: ${after}  IP: ${ip}`);
      socket.emit("banned");
      return socket.disconnect(true);
    }

    users[socket.id] = after;
    broadcastUsers();
  });

  　
  // 一時BAN追加
  　
  socket.on("tempBanAdd", (targetName) => {
    if (!targetName) return;

    console.log(`🔥 一時 BAN 追加: ${targetName}  IP: ${ip}`);

    if (!tempBan.includes(targetName)) tempBan.push(targetName);

    // 即BAN
    for (const sid in users) {
      if (users[sid] === targetName) {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.emit("banned");
          s.disconnect(true);
        }
      }
    }
  });

  　
  // 一時BAN解除
  　
  socket.on("tempBanRemove", (name) => {
    tempBan = tempBan.filter(n => n !== name);
    console.log(`♻ 一時 BAN 解除: ${name}  IP: ${ip}`);
  });

  　
  // チャット
  　
  socket.on("chat", (data) => {
    const { name, msg, isAdmin, color } = data;
    const after = name?.trim() || "名無し";

    if (tempBan.includes(after)) {
      console.log(`⛔ 一時 BAN チャット: ${after}  IP: ${ip}`);
      socket.emit("banned");
      return socket.disconnect(true);
    }

    users[socket.id] = after;
    broadcastUsers();

    console.log(`💬 chat ${after}: ${msg}  IP: ${ip}`);

    io.emit("chat", { name: after, msg, isAdmin, color });
  });

  　
  // ユーザー退出
  　
  socket.on("leave", (name) => {
    io.emit("leave", name || "名無し");
    console.log(`👋 退出イベント(debug): ${name}`);
  });

  socket.on("requestUsers", () => {
    broadcastUsers();
  });

  　
  // 切断
  　
  socket.on("disconnect", () => {
    const name = users[socket.id] || "名無し";
    delete users[socket.id];
    io.emit("leave", name);
    broadcastUsers();
    console.log(`🔴 切断: ${socket.id}  IP: ${ip}`);
  });
});

　
// 接続者リスト送信
　
function broadcastUsers() {
  const list = Object.values(users);
  io.emit("updateUsers", list);
}

　
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 server starting...: http://localhost:${PORT}`);
});

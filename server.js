const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const app = express();
const db = initDb();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

// Frontend (static)
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "Pagina_Login.html"));
});

app.get("/principal", (_req, res) => {
  res.sendFile(path.join(publicDir, "Pagina_Principal.html"));
});

// --- API ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---- Auth (Login / Cadastro) ----
// Token é stateless (JWT-like assinado com HMAC). O frontend salva o token em localStorage.
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function base64urlEncode(data) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;

  const fullPayload = { ...payload, iat: now, exp };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(data).digest();
  const encodedSig = base64urlEncode(signature);
  return `${data}.${encodedSig}`;
}

function verifyToken(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) throw new Error("token_malformed");
  const [encodedHeader, encodedPayload, encodedSig] = parts;

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(data).digest();
  const expectedEncodedSig = base64urlEncode(expectedSig);

  const a = Buffer.from(encodedSig);
  const b = Buffer.from(expectedEncodedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("token_invalid_signature");
  }

  const payloadJson = base64urlDecode(encodedPayload);
  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) throw new Error("token_expired");
  return payload;
}

function passwordHash(password, saltB64) {
  const salt = Buffer.from(saltB64, "base64");
  const iterations = 100000;
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return derived.toString("base64");
}

function extractBearerToken(req) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

app.post("/api/auth/signup", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  if (!username || username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: "username inválido (3 a 30 caracteres)" });
  }
  if (!/^[a-zA-Z0-9_\\.\\-]+$/.test(username)) {
    return res.status(400).json({ error: "username contém caracteres inválidos" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "password inválida (mínimo 6 caracteres)" });
  }

  const exists = db.prepare("SELECT id FROM users WHERE username = @username").get({ username });
  if (exists) return res.status(409).json({ error: "Usuário já existe" });

  const saltB64 = crypto.randomBytes(16).toString("base64");
  const hashB64 = passwordHash(password, saltB64);

  const result = db
    .prepare(
      `
      INSERT INTO users (username, email, password_salt, password_hash)
      VALUES (@username, @email, @password_salt, @password_hash)
      `
    )
    .run({
      username,
      email: email || null,
      password_salt: saltB64,
      password_hash: hashB64
    });

  const token = signToken({ sub: result.lastInsertRowid, username });
  res.status(201).json({ token, username });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Campos obrigatórios: username, password" });
  }

  const user = db
    .prepare(
      "SELECT id, username, password_salt, password_hash FROM users WHERE username = @username"
    )
    .get({ username });

  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const candidateHash = passwordHash(password, user.password_salt);
  if (candidateHash !== user.password_hash) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = signToken({ sub: user.id, username: user.username });
  res.json({ token, username: user.username });
});

app.get("/api/auth/me", (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ error: "Token ausente" });

    const payload = verifyToken(token);
    res.json({ userId: payload.sub, username: payload.username });
  } catch (_err) {
    res.status(401).json({ error: "Token inválido/expirado" });
  }
});

app.get("/api/categories", (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        c.id,
        c.name,
        c.icon,
        c.featured,
        (
          SELECT COUNT(*)
          FROM articles a
          WHERE a.category_id = c.id
        ) AS articleCount
      FROM categories c
      ORDER BY c.featured DESC, c.name ASC
    `
    )
    .all();
  res.json(rows);
});

app.get("/api/articles", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  const featuredOnly = String(req.query.featured || "").trim() === "1";

  const where = [];
  const params = {};

  if (featuredOnly) where.push("a.featured = 1");
  if (category) {
    where.push("c.name = @category");
    params.category = category;
  }
  if (q) {
    where.push(
      "(lower(a.title) LIKE @q OR lower(a.excerpt) LIKE @q OR lower(c.name) LIKE @q)"
    );
    params.q = `%${q}%`;
  }

  const sql = `
    SELECT
      a.id,
      a.title,
      a.excerpt,
      a.icon,
      a.featured,
      c.name AS category
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY a.featured DESC, a.id DESC
    LIMIT 50
  `;

  const rows = db.prepare(sql).all(params);
  res.json(rows);
});

app.get("/api/faqs", (_req, res) => {
  const rows = db
    .prepare("SELECT id, question, answer FROM faqs ORDER BY id ASC")
    .all();
  res.json(rows);
});

app.post("/api/tickets", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      error: "Campos obrigatórios: name, email, subject, message"
    });
  }

  const result = db
    .prepare(
      `
      INSERT INTO tickets (name, email, subject, message)
      VALUES (@name, @email, @subject, @message)
    `
    )
    .run({ name, email, subject, message });

  res.status(201).json({ id: result.lastInsertRowid });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


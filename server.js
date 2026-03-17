const path = require("node:path");
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const app = express();
const db = initDb();

app.use(cors());
app.use(express.json({ limit: "256kb" }));

// Frontend (static)
app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "Pagina_Principal.html"));
});

// --- API ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

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


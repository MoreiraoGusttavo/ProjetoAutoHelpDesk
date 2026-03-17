const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function openDb() {
  const dataDir = path.join(__dirname, "data");
  ensureDir(dataDir);
  const dbPath = path.join(dataDir, "helpdesk.sqlite");
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      icon TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
    CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured);

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seed(db) {
  const hasAnyCategory = db.prepare("SELECT 1 FROM categories LIMIT 1").get();
  if (hasAnyCategory) return;

  const insertCategory = db.prepare(
    "INSERT INTO categories (name, icon, featured) VALUES (@name, @icon, @featured)"
  );
  const insertArticle = db.prepare(
    `INSERT INTO articles (title, excerpt, icon, featured, category_id)
     VALUES (@title, @excerpt, @icon, @featured, @category_id)`
  );
  const insertFaq = db.prepare(
    "INSERT INTO faqs (question, answer) VALUES (@question, @answer)"
  );

  const tx = db.transaction(() => {
    const categories = [
      { name: "Início Rápido", icon: "🚀", featured: 0 },
      { name: "Conta e Perfil", icon: "👤", featured: 1 },
      { name: "HelpDesk", icon: "🚨", featured: 0 },
      { name: "Cobrança", icon: "💳", featured: 0 },
      { name: "Segurança", icon: "🔒", featured: 0 },
      { name: "Integrações", icon: "🔌", featured: 0 },
      { name: "Solução de Problemas", icon: "🔧", featured: 0 }
    ];

    for (const c of categories) insertCategory.run(c);

    const categoryIdByName = Object.fromEntries(
      db
        .prepare("SELECT id, name FROM categories")
        .all()
        .map((r) => [r.name, r.id])
    );

    const articles = [
      {
        title: "Como criar minha conta",
        excerpt: "Aprenda a configurar sua conta em poucos passos simples...",
        icon: "📝",
        featured: 1,
        category: "Início Rápido"
      },
      {
        title: "Como recuperar minha senha",
        excerpt: "Siga este guia passo a passo para recuperar o acesso à sua conta...",
        icon: "🔑",
        featured: 1,
        category: "Conta e Perfil"
      },
      {
        title: "Métodos de pagamento aceitos",
        excerpt: "Veja todas as formas de pagamento disponíveis e como utilizá-las...",
        icon: "💳",
        featured: 1,
        category: "Cobrança"
      }
    ];

    for (const a of articles) {
      insertArticle.run({
        title: a.title,
        excerpt: a.excerpt,
        icon: a.icon,
        featured: a.featured,
        category_id: categoryIdByName[a.category]
      });
    }

    const faqs = [
      {
        question: "Como altero minha senha?",
        answer:
          "Para alterar sua senha, acesse Configurações > Segurança > Alterar Senha. Você receberá um email de confirmação para completar a alteração."
      },
      {
        question: "Como cancelo minha assinatura?",
        answer:
          "Você pode cancelar sua assinatura a qualquer momento em Configurações > Assinatura > Cancelar. Seu acesso permanecerá ativo até o fim do período pago."
      },
      {
        question: "Como entro em contato com o suporte?",
        answer:
          "Você pode abrir um ticket de suporte usando o formulário abaixo ou enviar um email para suporte@gsmsystems.com. Nossa equipe responde em até 24 horas dependendo do plano/demanda."
      },
      {
        question: "Como funciona cada Plano?",
        answer: "Plano A/Plano B/Plano C/Plano D/Plano E/Plano F"
      },
      {
        question: "Meu pagamento não foi processado, o que fazer?",
        answer:
          "Verifique se os dados do cartão estão corretos. Se o problema persistir, entre em contato com seu banco ou tente usar outro método de pagamento."
      }
    ];
    for (const f of faqs) insertFaq.run(f);
  });

  tx();
}

function initDb() {
  const db = openDb();
  migrate(db);
  seed(db);
  return db;
}

module.exports = { initDb };


const bcrypt = require("bcryptjs");
const db = require("../../src/config/db");

const TEST_PREFIX = "[ITEST]";
const TEST_CATEGORY = "TESTE_AUTOMACAO";
const TEST_PASSWORD = "123456";
const TEST_USERS = {
  empresa1: {
    nome: `${TEST_PREFIX} Admin Empresa 1`,
    email: `admin-empresa1@itest.pedemais.local`,
    perfil: "admin",
    empresa_id: 1,
  },
  empresa2: {
    nome: `${TEST_PREFIX} Admin Empresa 2`,
    email: `admin-empresa2@itest.pedemais.local`,
    perfil: "admin",
    empresa_id: 2,
  },
};

const columnsCache = new Map();

function placeholders(size) {
  return Array.from({ length: size }, () => "?").join(", ");
}

function firstEnumValue(type = "") {
  const match = type.match(/^enum\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const values = match[1]
    .split(",")
    .map((item) => item.trim().replace(/^'/, "").replace(/'$/, ""))
    .filter(Boolean);

  return values[0] || null;
}

function inferRequiredValue(column) {
  const type = String(column.Type || "").toLowerCase();
  const field = String(column.Field || "").toLowerCase();

  if (type.includes("tinyint(1)")) {
    return 1;
  }

  if (
    type.includes("int") ||
    type.includes("bigint") ||
    type.includes("smallint")
  ) {
    return 1;
  }

  if (
    type.includes("decimal") ||
    type.includes("float") ||
    type.includes("double")
  ) {
    return 0;
  }

  const enumValue = firstEnumValue(type);
  if (enumValue) {
    return enumValue;
  }

  if (type.includes("time")) {
    if (field.includes("abertura")) {
      return "08:00:00";
    }
    if (field.includes("fechamento")) {
      return "22:00:00";
    }
    return "00:00:00";
  }

  if (type.includes("date")) {
    return "2026-01-01";
  }

  if (type.includes("json")) {
    return "{}";
  }

  return `${TEST_PREFIX} ${column.Field}`;
}

async function getColumns(tableName) {
  if (columnsCache.has(tableName)) {
    return columnsCache.get(tableName);
  }

  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  columnsCache.set(tableName, rows);
  return rows;
}

function buildRow(columns, overrides = {}) {
  const row = {};

  for (const column of columns) {
    const field = column.Field;

    if (Object.prototype.hasOwnProperty.call(overrides, field)) {
      row[field] = overrides[field];
      continue;
    }

    const isAutoIncrement = String(column.Extra || "")
      .toLowerCase()
      .includes("auto_increment");
    const isRequired = column.Null === "NO" && column.Default == null;

    if (isAutoIncrement || !isRequired) {
      continue;
    }

    row[field] = inferRequiredValue(column);
  }

  return row;
}

async function upsertEmpresa(id) {
  const columns = await getColumns("empresas");
  const row = buildRow(columns, {
    id,
    nome: `${TEST_PREFIX} Empresa ${id}`,
    aceita_entrega: 1,
    aceita_retirada: 1,
    taxa_entrega: 0,
    telefone: "11999999999",
    endereco: `${TEST_PREFIX} Endereço ${id}`,
    horario_abertura: "08:00:00",
    horario_fechamento: "22:00:00",
  });

  const fields = Object.keys(row);
  const values = fields.map((field) => row[field]);

  await db.query(
    `INSERT INTO empresas (${fields.join(", ")}) VALUES (${placeholders(fields.length)}) ON DUPLICATE KEY UPDATE id = id`,
    values,
  );
}

async function createOrReplaceUser(user) {
  const columns = await getColumns("usuarios");
  const senhaHash = await bcrypt.hash(TEST_PASSWORD, 10);

  await db.query("DELETE FROM usuarios WHERE email = ?", [user.email]);

  const row = buildRow(columns, {
    nome: user.nome,
    email: user.email,
    senha: senhaHash,
    perfil: user.perfil,
    empresa_id: user.empresa_id,
  });

  const fields = Object.keys(row);
  const values = fields.map((field) => row[field]);

  await db.query(
    `INSERT INTO usuarios (${fields.join(", ")}) VALUES (${placeholders(fields.length)})`,
    values,
  );
}

async function ensureBaseData() {
  await upsertEmpresa(1);
  await upsertEmpresa(2);
  await upsertEmpresa(999);

  await createOrReplaceUser(TEST_USERS.empresa1);
  await createOrReplaceUser(TEST_USERS.empresa2);
}

async function cleanupTestData() {
  const [produtoRows] = await db.query(
    `SELECT id FROM produtos WHERE nome LIKE ? OR categoria = ?`,
    [`${TEST_PREFIX}%`, TEST_CATEGORY],
  );
  const [pedidoRows] = await db.query(
    `SELECT id FROM pedidos WHERE cliente_nome LIKE ?`,
    [`${TEST_PREFIX}%`],
  );

  const produtoIds = produtoRows.map((row) => row.id);
  const pedidoIds = pedidoRows.map((row) => row.id);

  if (pedidoIds.length) {
    await db.query(
      `DELETE FROM itens_pedido WHERE pedido_id IN (${placeholders(pedidoIds.length)})`,
      pedidoIds,
    );
  }

  if (produtoIds.length) {
    await db.query(
      `DELETE FROM itens_pedido WHERE produto_id IN (${placeholders(produtoIds.length)})`,
      produtoIds,
    );
  }

  if (pedidoIds.length) {
    await db.query(
      `DELETE FROM pedidos WHERE id IN (${placeholders(pedidoIds.length)})`,
      pedidoIds,
    );
  }

  if (produtoIds.length) {
    await db.query(
      `DELETE FROM estoque WHERE produto_id IN (${placeholders(produtoIds.length)})`,
      produtoIds,
    );
    await db.query(
      `DELETE FROM produtos WHERE id IN (${placeholders(produtoIds.length)})`,
      produtoIds,
    );
  }

  await db.query("DELETE FROM usuarios WHERE email LIKE ?", [
    `%@itest.pedemais.local`,
  ]);

  const [webhookTable] = await db.query("SHOW TABLES LIKE 'whatsapp_eventos'");
  if (webhookTable.length) {
    await db.query(
      "DELETE FROM whatsapp_eventos WHERE telefone_origem LIKE ?",
      ["5511%"],
    );
    await db.query("DELETE FROM whatsapp_eventos WHERE id_externo LIKE ?", [
      `${TEST_PREFIX}%`,
    ]);
  }

  const [sessaoTable] = await db.query("SHOW TABLES LIKE 'whatsapp_sessoes'");
  if (sessaoTable.length) {
    await db.query(
      "DELETE FROM whatsapp_sessoes WHERE telefone_origem LIKE ?",
      ["5511%"],
    );
  }

  const [carrinhoTable] = await db.query(
    "SHOW TABLES LIKE 'whatsapp_carrinho_tmp'",
  );
  if (carrinhoTable.length) {
    await db.query("DELETE FROM whatsapp_carrinho_tmp");
  }
}

module.exports = {
  db,
  TEST_PREFIX,
  TEST_CATEGORY,
  TEST_PASSWORD,
  TEST_USERS,
  ensureBaseData,
  cleanupTestData,
};

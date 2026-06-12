const db = require("../config/db");

const columnsCache = new Map();

function placeholders(size) {
  return Array.from({ length: size }, () => "?").join(", ");
}

function firstEnumValue(type = "") {
  const match = type.match(/^enum\((.*)\)$/i);
  if (!match) {
    return null;
  }

  return match[1]
    .split(",")
    .map((item) => item.trim().replace(/^'/, "").replace(/'$/, ""))
    .find(Boolean);
}

function inferRequiredValue(column) {
  const type = String(column.Type || "").toLowerCase();
  const field = String(column.Field || "").toLowerCase();

  if (type.includes("tinyint(1)")) {
    return 1;
  }

  if (type.includes("int")) {
    return 0;
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

  return "";
}

async function getColumns(tableName, connection = db) {
  if (columnsCache.has(tableName)) {
    return columnsCache.get(tableName);
  }

  const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
  columnsCache.set(tableName, rows);
  return rows;
}

function buildInsertRow(columns, values) {
  const row = {};

  for (const column of columns) {
    const field = column.Field;
    const isAutoIncrement = String(column.Extra || "")
      .toLowerCase()
      .includes("auto_increment");

    if (isAutoIncrement) {
      continue;
    }

    if (
      Object.prototype.hasOwnProperty.call(values, field) &&
      values[field] !== undefined &&
      values[field] !== null &&
      values[field] !== ""
    ) {
      row[field] = values[field];
      continue;
    }

    const isRequired = column.Null === "NO" && column.Default == null;
    if (isRequired) {
      row[field] = inferRequiredValue(column);
    }
  }

  return row;
}

async function findUsuarioByEmail(email) {
  const [rows] = await db.query(
    `SELECT id, nome, email, senha, perfil, empresa_id
     FROM usuarios
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

async function createEmpresaAndUsuario({ empresa, usuario }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const empresaColumns = await getColumns("empresas", connection);
    const empresaRow = buildInsertRow(empresaColumns, {
      nome: empresa.nome,
      cidade: empresa.cidade,
      endereco: empresa.endereco,
      numero: empresa.numero,
      cnpj: empresa.documento,
      cpf: empresa.documento,
      documento: empresa.documento,
      cep: empresa.cep,
      foco: empresa.foco,
      telefone: empresa.telefone,
      telefone_comercial: empresa.telefone,
      email: empresa.email,
      email_comercial: empresa.email,
      aceita_entrega: 1,
      aceita_retirada: 1,
      taxa_entrega: 0,
      horario_abertura: "08:00:00",
      horario_fechamento: "22:00:00",
    });

    const empresaFields = Object.keys(empresaRow);
    const [empresaResult] = await connection.query(
      `INSERT INTO empresas (${empresaFields.join(", ")}) VALUES (${placeholders(empresaFields.length)})`,
      empresaFields.map((field) => empresaRow[field]),
    );

    const empresaId = empresaResult.insertId;
    const usuarioColumns = await getColumns("usuarios", connection);
    const usuarioRow = buildInsertRow(usuarioColumns, {
      nome: usuario.nome,
      cpf: usuario.cpf,
      nascimento: usuario.nascimento,
      telefone: usuario.telefone,
      endereco: usuario.endereco,
      cep: usuario.cep,
      email: usuario.email,
      senha: usuario.senha,
      perfil: "admin",
      empresa_id: empresaId,
    });

    const usuarioFields = Object.keys(usuarioRow);
    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (${usuarioFields.join(", ")}) VALUES (${placeholders(usuarioFields.length)})`,
      usuarioFields.map((field) => usuarioRow[field]),
    );

    await connection.commit();

    return {
      empresaId,
      usuarioId: usuarioResult.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createEmpresaAndUsuario,
  findUsuarioByEmail,
};

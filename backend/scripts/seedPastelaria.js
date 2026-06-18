const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

const DEMO = {
  empresaId: 1001,
  usuarioId: 1964,
  nome: "Pastelaria Rio",
  email: "pastelariario@gmail.com",
  senha: "123456",
};

const columnsCache = new Map();

const produtos = [
  {
    nome: "Pastel de Carne",
    descricao: "Pastel crocante recheado com carne moida temperada.",
    preco: 12.0,
    categoria: "Pasteis",
    ativo: 1,
    quantidade: 42,
    estoque_minimo: 12,
  },
  {
    nome: "Pastel de Queijo",
    descricao: "Pastel tradicional com queijo derretido.",
    preco: 11.0,
    categoria: "Pasteis",
    ativo: 1,
    quantidade: 38,
    estoque_minimo: 10,
  },
  {
    nome: "Pastel de Frango com Catupiry",
    descricao: "Frango desfiado com catupiry cremoso.",
    preco: 14.5,
    categoria: "Pasteis",
    ativo: 1,
    quantidade: 24,
    estoque_minimo: 8,
  },
  {
    nome: "Pastel de Palmito",
    descricao: "Recheio cremoso de palmito com temperos da casa.",
    preco: 13.5,
    categoria: "Pasteis",
    ativo: 1,
    quantidade: 9,
    estoque_minimo: 10,
  },
  {
    nome: "Caldo de Cana 500ml",
    descricao: "Caldo de cana gelado espremido na hora.",
    preco: 8.0,
    categoria: "Bebidas",
    ativo: 1,
    quantidade: 30,
    estoque_minimo: 8,
  },
  {
    nome: "Refrigerante Lata",
    descricao: "Lata 350ml sabores variados.",
    preco: 6.5,
    categoria: "Bebidas",
    ativo: 1,
    quantidade: 55,
    estoque_minimo: 15,
  },
  {
    nome: "Porcao de Mini Pasteis",
    descricao: "10 mini pasteis sortidos para compartilhar.",
    preco: 32.0,
    categoria: "Porcoes",
    ativo: 1,
    quantidade: 16,
    estoque_minimo: 5,
  },
  {
    nome: "Combo Pastel + Caldo",
    descricao: "Um pastel tradicional acompanhado de caldo de cana.",
    preco: 18.0,
    categoria: "Combos",
    ativo: 1,
    quantidade: 20,
    estoque_minimo: 6,
  },
];

const pedidos = [
  {
    cliente_nome: "Rafael Costa",
    telefone: "21987654321",
    tipo_recebimento: "entrega",
    endereco: "Rua do Catete, 85 - Catete",
    forma_pagamento: "pix",
    troco_para: null,
    status: "pendente",
    criado_em: "2026-06-18 10:20:00",
    itens: [
      ["Pastel de Carne", 2],
      ["Caldo de Cana 500ml", 2],
    ],
  },
  {
    cliente_nome: "Bianca Oliveira",
    telefone: "21976543210",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "cartao",
    troco_para: null,
    status: "em_preparo",
    criado_em: "2026-06-18 11:05:00",
    itens: [
      ["Pastel de Frango com Catupiry", 1],
      ["Refrigerante Lata", 1],
    ],
  },
  {
    cliente_nome: "Marcelo Silva",
    telefone: "21965432109",
    tipo_recebimento: "entrega",
    endereco: "Av. Nossa Senhora de Copacabana, 450 - Copacabana",
    forma_pagamento: "dinheiro",
    troco_para: 80,
    status: "saiu_para_entrega",
    criado_em: "2026-06-18 12:15:00",
    itens: [
      ["Porcao de Mini Pasteis", 1],
      ["Caldo de Cana 500ml", 3],
    ],
  },
  {
    cliente_nome: "Juliana Rocha",
    telefone: "21954321098",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "pix",
    troco_para: null,
    status: "entregue",
    criado_em: "2026-06-18 13:40:00",
    itens: [
      ["Combo Pastel + Caldo", 2],
      ["Pastel de Queijo", 1],
    ],
  },
  {
    cliente_nome: "Henrique Lima",
    telefone: "21943210987",
    tipo_recebimento: "entrega",
    endereco: "Rua Voluntarios da Patria, 210 - Botafogo",
    forma_pagamento: "cartao",
    troco_para: null,
    status: "cancelado",
    criado_em: "2026-06-18 14:25:00",
    itens: [
      ["Pastel de Palmito", 2],
      ["Refrigerante Lata", 2],
    ],
  },
  {
    cliente_nome: "Camila Ferreira",
    telefone: "21932109876",
    tipo_recebimento: "entrega",
    endereco: "Rua Conde de Bonfim, 600 - Tijuca",
    forma_pagamento: "pix",
    troco_para: null,
    status: "entregue",
    criado_em: "2026-06-18 15:10:00",
    itens: [
      ["Pastel de Carne", 1],
      ["Pastel de Queijo", 1],
      ["Caldo de Cana 500ml", 1],
    ],
  },
];

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

  if (
    type.includes("int") ||
    type.includes("bigint") ||
    type.includes("smallint")
  ) {
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
      return "10:00:00";
    }
    if (field.includes("fechamento")) {
      return "23:00:00";
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

function buildRow(columns, values) {
  const row = {};

  for (const column of columns) {
    const field = column.Field;
    const isAutoIncrement = String(column.Extra || "")
      .toLowerCase()
      .includes("auto_increment");

    if (isAutoIncrement && values[field] == null) {
      continue;
    }

    if (
      Object.prototype.hasOwnProperty.call(values, field) &&
      values[field] !== undefined
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

async function insertRow(connection, tableName, row) {
  const fields = Object.keys(row);
  const [result] = await connection.query(
    `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${placeholders(fields.length)})`,
    fields.map((field) => row[field]),
  );

  return result.insertId;
}

async function upsertEmpresa(connection) {
  const columns = await getColumns("empresas", connection);
  const row = buildRow(columns, {
    id: DEMO.empresaId,
    nome: "Pastelaria Rio",
    cidade: "Rio de Janeiro",
    endereco: "Rua do Catete, 100",
    numero: "100",
    cnpj: "22345678000190",
    cpf: "22345678900",
    documento: "22345678000190",
    cep: "22220000",
    foco: "Pastelaria",
    telefone: "21999990000",
    telefone_comercial: "21999990000",
    email: DEMO.email,
    email_comercial: DEMO.email,
    aceita_entrega: 1,
    aceita_retirada: 1,
    taxa_entrega: 7.0,
    horario_abertura: "10:00:00",
    horario_fechamento: "23:00:00",
  });

  const fields = Object.keys(row);
  const updateFields = fields.filter((field) => field !== "id");
  const updateSql = updateFields
    .map((field) => `${field} = VALUES(${field})`)
    .join(", ");

  await connection.query(
    `INSERT INTO empresas (${fields.join(", ")}) VALUES (${placeholders(fields.length)})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    fields.map((field) => row[field]),
  );
}

async function upsertUsuario(connection) {
  const [idRows] = await connection.query(
    "SELECT id, email FROM usuarios WHERE id = ? LIMIT 1",
    [DEMO.usuarioId],
  );
  if (idRows.length && idRows[0].email !== DEMO.email) {
    throw new Error(
      `O usuario id ${DEMO.usuarioId} ja existe com o email ${idRows[0].email}. Ajuste esse registro antes de rodar o seed.`,
    );
  }

  const [emailRows] = await connection.query(
    "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
    [DEMO.email],
  );
  if (emailRows.length && Number(emailRows[0].id) !== DEMO.usuarioId) {
    throw new Error(
      `O email ${DEMO.email} ja existe no usuario id ${emailRows[0].id}. Ajuste esse registro antes de rodar o seed.`,
    );
  }

  const senhaHash = await bcrypt.hash(DEMO.senha, 10);
  const columns = await getColumns("usuarios", connection);
  const row = buildRow(columns, {
    id: DEMO.usuarioId,
    nome: DEMO.nome,
    email: DEMO.email,
    senha: senhaHash,
    perfil: "admin",
    empresa_id: DEMO.empresaId,
  });

  const fields = Object.keys(row);
  const updateFields = fields.filter((field) => field !== "id");
  const updateSql = updateFields
    .map((field) => `${field} = VALUES(${field})`)
    .join(", ");

  await connection.query(
    `INSERT INTO usuarios (${fields.join(", ")}) VALUES (${placeholders(fields.length)})
     ON DUPLICATE KEY UPDATE ${updateSql}`,
    fields.map((field) => row[field]),
  );
}

async function cleanupEmpresaDemo(connection) {
  const [produtoRows] = await connection.query(
    "SELECT id FROM produtos WHERE empresa_id = ?",
    [DEMO.empresaId],
  );
  const produtoIds = produtoRows.map((row) => row.id);

  const [pedidoRows] = await connection.query(
    "SELECT id FROM pedidos WHERE empresa_id = ?",
    [DEMO.empresaId],
  );
  const pedidoIds = pedidoRows.map((row) => row.id);

  if (pedidoIds.length) {
    await connection.query(
      `DELETE FROM itens_pedido WHERE pedido_id IN (${placeholders(pedidoIds.length)})`,
      pedidoIds,
    );
  }

  if (produtoIds.length) {
    await connection.query(
      `DELETE FROM itens_pedido WHERE produto_id IN (${placeholders(produtoIds.length)})`,
      produtoIds,
    );
  }

  await connection.query("DELETE FROM pedidos WHERE empresa_id = ?", [
    DEMO.empresaId,
  ]);

  if (produtoIds.length) {
    await connection.query(
      `DELETE FROM estoque WHERE produto_id IN (${placeholders(produtoIds.length)})`,
      produtoIds,
    );
  }

  await connection.query("DELETE FROM produtos WHERE empresa_id = ?", [
    DEMO.empresaId,
  ]);
}

async function criarProdutos(connection) {
  const produtoIdsByName = new Map();

  for (const produto of produtos) {
    const [result] = await connection.query(
      `INSERT INTO produtos (empresa_id, nome, descricao, preco, categoria, ativo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        DEMO.empresaId,
        produto.nome,
        produto.descricao,
        produto.preco,
        produto.categoria,
        produto.ativo,
      ],
    );

    const produtoId = result.insertId;
    produtoIdsByName.set(produto.nome, produtoId);

    await connection.query(
      `INSERT INTO estoque (produto_id, quantidade, estoque_minimo)
       VALUES (?, ?, ?)`,
      [produtoId, produto.quantidade, produto.estoque_minimo],
    );
  }

  return produtoIdsByName;
}

async function criarPedidos(connection, produtoIdsByName) {
  const pedidoColumns = await getColumns("pedidos", connection);

  for (const pedido of pedidos) {
    const itens = pedido.itens.map(([produtoNome, quantidade]) => {
      const produto = produtos.find((item) => item.nome === produtoNome);
      const produtoId = produtoIdsByName.get(produtoNome);

      if (!produto || !produtoId) {
        throw new Error(`Produto nao encontrado para pedido: ${produtoNome}`);
      }

      return {
        produto_id: produtoId,
        quantidade,
        preco_unitario: produto.preco,
      };
    });

    const valorTotal = itens.reduce(
      (total, item) => total + item.quantidade * item.preco_unitario,
      0,
    );

    const pedidoRow = buildRow(pedidoColumns, {
      empresa_id: DEMO.empresaId,
      cliente_nome: pedido.cliente_nome,
      telefone: pedido.telefone,
      tipo_recebimento: pedido.tipo_recebimento,
      endereco: pedido.endereco,
      forma_pagamento: pedido.forma_pagamento,
      troco_para: pedido.troco_para,
      status: pedido.status,
      valor_total: valorTotal,
      criado_em: pedido.criado_em,
    });

    const pedidoId = await insertRow(connection, "pedidos", pedidoRow);

    const values = itens.map((item) => [
      pedidoId,
      item.produto_id,
      item.quantidade,
      item.preco_unitario,
    ]);

    await connection.query(
      `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
       VALUES ?`,
      [values],
    );
  }
}

async function main() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await upsertEmpresa(connection);
    await upsertUsuario(connection);
    await cleanupEmpresaDemo(connection);
    const produtoIdsByName = await criarProdutos(connection);
    await criarPedidos(connection, produtoIdsByName);

    await connection.commit();

    console.log("Seed de demo da pastelaria criado com sucesso.");
    console.log(`Login: ${DEMO.email}`);
    console.log(`Senha: ${DEMO.senha}`);
    console.log(`Empresa: ${DEMO.empresaId} - Pastelaria Rio`);
    console.log(`${produtos.length} produtos e ${pedidos.length} pedidos criados.`);
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao criar seed de demo da pastelaria:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await db.end();
  }
}

main();

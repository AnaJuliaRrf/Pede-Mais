const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const db = require("../src/config/db");

const DEMO = {
  empresaId: 1000,
  usuarioId: 1963,
  nome: "Larissa",
  email: "doces@gmail.com",
  senha: "123456",
};

const columnsCache = new Map();

const produtos = [
  {
    nome: "Bolo de Chocolate",
    descricao: "Massa de chocolate, recheio de brigadeiro e cobertura cremosa.",
    preco: 78.9,
    categoria: "Bolos",
    ativo: 1,
    quantidade: 14,
    estoque_minimo: 4,
  },
  {
    nome: "Bolo de Ninho com Morango",
    descricao: "Bolo gelado com creme de leite Ninho e morangos frescos.",
    preco: 92.5,
    categoria: "Bolos",
    ativo: 1,
    quantidade: 9,
    estoque_minimo: 3,
  },
  {
    nome: "Caixa de Brigadeiros",
    descricao: "12 brigadeiros gourmet sortidos.",
    preco: 36.0,
    categoria: "Docinhos",
    ativo: 1,
    quantidade: 35,
    estoque_minimo: 10,
  },
  {
    nome: "Brownie Recheado",
    descricao: "Brownie individual com recheio de doce de leite.",
    preco: 12.5,
    categoria: "Sobremesas",
    ativo: 1,
    quantidade: 28,
    estoque_minimo: 8,
  },
  {
    nome: "Torta de Limão",
    descricao: "Torta com creme de limão, merengue e massa amanteigada.",
    preco: 64.0,
    categoria: "Tortas",
    ativo: 1,
    quantidade: 6,
    estoque_minimo: 2,
  },
  {
    nome: "Cupcake Red Velvet",
    descricao: "Cupcake individual com cream cheese.",
    preco: 9.9,
    categoria: "Cupcakes",
    ativo: 1,
    quantidade: 3,
    estoque_minimo: 6,
  },
];

const pedidos = [
  {
    cliente_nome: "Mariana Souza",
    telefone: "11987654321",
    tipo_recebimento: "entrega",
    endereco: "Rua das Flores, 120 - Centro",
    forma_pagamento: "pix",
    troco_para: null,
    status: "pendente",
    criado_em: "2026-06-18 09:20:00",
    itens: [
      ["Bolo de Chocolate", 1],
      ["Caixa de Brigadeiros", 2],
    ],
  },
  {
    cliente_nome: "Joao Pereira",
    telefone: "11976543210",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "cartao",
    troco_para: null,
    status: "em_preparo",
    criado_em: "2026-06-18 10:05:00",
    itens: [
      ["Brownie Recheado", 4],
      ["Cupcake Red Velvet", 6],
    ],
  },
  {
    cliente_nome: "Camila Martins",
    telefone: "11965432109",
    tipo_recebimento: "entrega",
    endereco: "Av. Brasil, 455 - Jardim Primavera",
    forma_pagamento: "dinheiro",
    troco_para: 150,
    status: "saiu_para_entrega",
    criado_em: "2026-06-18 10:35:00",
    itens: [
      ["Bolo de Ninho com Morango", 1],
      ["Torta de Limão", 1],
    ],
  },
  {
    cliente_nome: "Renata Alves",
    telefone: "11954321098",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "pix",
    troco_para: null,
    status: "entregue",
    criado_em: "2026-06-18 11:15:00",
    itens: [
      ["Caixa de Brigadeiros", 3],
      ["Brownie Recheado", 2],
    ],
  },
  {
    cliente_nome: "Lucas Almeida",
    telefone: "11943210987",
    tipo_recebimento: "entrega",
    endereco: "Rua Sao Bento, 78 - Vila Nova",
    forma_pagamento: "cartao",
    troco_para: null,
    status: "cancelado",
    criado_em: "2026-06-18 11:50:00",
    itens: [["Cupcake Red Velvet", 8]],
  },
  {
    cliente_nome: "Beatriz Lima",
    telefone: "11932109876",
    tipo_recebimento: "entrega",
    endereco: "Rua Aurora, 42 - Bela Vista",
    forma_pagamento: "pix",
    troco_para: null,
    status: "pendente",
    criado_em: "2026-06-18 12:25:00",
    itens: [
      ["Torta de Limão", 1],
      ["Brownie Recheado", 6],
    ],
  },
  {
    cliente_nome: "Fernanda Castro",
    telefone: "11921098765",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "cartao",
    troco_para: null,
    status: "em_preparo",
    criado_em: "2026-06-18 13:10:00",
    itens: [
      ["Bolo de Chocolate", 1],
      ["Cupcake Red Velvet", 10],
    ],
  },
  {
    cliente_nome: "Patricia Gomes",
    telefone: "11910987654",
    tipo_recebimento: "entrega",
    endereco: "Av. Paulista, 1000 - Bela Vista",
    forma_pagamento: "dinheiro",
    troco_para: 200,
    status: "entregue",
    criado_em: "2026-06-18 14:05:00",
    itens: [
      ["Bolo de Ninho com Morango", 1],
      ["Caixa de Brigadeiros", 1],
    ],
  },
  {
    cliente_nome: "Aline Rodrigues",
    telefone: "11909876543",
    tipo_recebimento: "retirada",
    endereco: null,
    forma_pagamento: "pix",
    troco_para: null,
    status: "saiu_para_entrega",
    criado_em: "2026-06-18 15:00:00",
    itens: [
      ["Brownie Recheado", 5],
      ["Caixa de Brigadeiros", 2],
    ],
  },
  {
    cliente_nome: "Sofia Mendes",
    telefone: "11898765432",
    tipo_recebimento: "entrega",
    endereco: "Rua Haddock Lobo, 250 - Cerqueira Cesar",
    forma_pagamento: "cartao",
    troco_para: null,
    status: "entregue",
    criado_em: "2026-06-18 16:20:00",
    itens: [
      ["Bolo de Chocolate", 2],
      ["Torta de Limão", 1],
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
  const cacheKey = `${tableName}`;
  if (columnsCache.has(cacheKey)) {
    return columnsCache.get(cacheKey);
  }

  const [rows] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
  columnsCache.set(cacheKey, rows);
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
    nome: "Doces da Larissa",
    cidade: "Sao Paulo",
    endereco: "Rua das Acacias, 100",
    numero: "100",
    cnpj: "12345678000199",
    cpf: "12345678900",
    documento: "12345678000199",
    cep: "01001000",
    foco: "Confeitaria artesanal",
    telefone: "11999990000",
    telefone_comercial: "11999990000",
    email: DEMO.email,
    email_comercial: DEMO.email,
    aceita_entrega: 1,
    aceita_retirada: 1,
    taxa_entrega: 8.5,
    horario_abertura: "09:00:00",
    horario_fechamento: "20:00:00",
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

    console.log("Seed de demo criado com sucesso.");
    console.log(`Login: ${DEMO.email}`);
    console.log(`Senha: ${DEMO.senha}`);
    console.log(`Empresa: ${DEMO.empresaId} - Doces da Larissa`);
    console.log(`${produtos.length} produtos e ${pedidos.length} pedidos criados.`);
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao criar seed de demo:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await db.end();
  }
}

main();

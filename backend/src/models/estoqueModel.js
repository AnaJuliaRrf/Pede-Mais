const db = require("../config/db");

async function listEstoqueByEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT
      p.id AS produto_id,
      p.empresa_id,
      p.nome,
      p.descricao,
      p.preco,
      p.categoria,
      p.ativo,
      COALESCE(e.quantidade, 0) AS quantidade,
      COALESCE(e.estoque_minimo, 0) AS estoque_minimo
     FROM produtos p
     LEFT JOIN estoque e ON e.produto_id = p.id
     WHERE p.empresa_id = ?
     ORDER BY p.id DESC`,
    [empresaId],
  );

  return rows;
}

async function listEstoqueBaixoByEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT
      p.id AS produto_id,
      p.empresa_id,
      p.nome,
      p.descricao,
      p.preco,
      p.categoria,
      p.ativo,
      COALESCE(e.quantidade, 0) AS quantidade,
      COALESCE(e.estoque_minimo, 0) AS estoque_minimo
     FROM produtos p
     LEFT JOIN estoque e ON e.produto_id = p.id
     WHERE p.empresa_id = ?
       AND COALESCE(e.quantidade, 0) <= COALESCE(e.estoque_minimo, 0)
     ORDER BY p.id DESC`,
    [empresaId],
  );

  return rows;
}

async function findProdutoByEmpresa(empresaId, produtoId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome
     FROM produtos
     WHERE id = ? AND empresa_id = ?
     LIMIT 1`,
    [produtoId, empresaId],
  );

  return rows[0] || null;
}

async function createEstoqueIfMissing(produtoId) {
  await db.query(
    `INSERT INTO estoque (produto_id, quantidade, estoque_minimo)
     SELECT ?, 0, 0
     WHERE NOT EXISTS (
       SELECT 1 FROM estoque WHERE produto_id = ?
     )`,
    [produtoId, produtoId],
  );
}

async function updateEstoqueByProdutoId(produtoId, updates) {
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(updates, "quantidade")) {
    fields.push("quantidade = ?");
    values.push(updates.quantidade);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "estoque_minimo")) {
    fields.push("estoque_minimo = ?");
    values.push(updates.estoque_minimo);
  }

  if (!fields.length) {
    const [rows] = await db.query(
      `SELECT produto_id, quantidade, estoque_minimo
       FROM estoque
       WHERE produto_id = ?
       LIMIT 1`,
      [produtoId],
    );

    return rows[0] || null;
  }

  values.push(produtoId);

  await db.query(
    `UPDATE estoque
     SET ${fields.join(", ")}
     WHERE produto_id = ?`,
    values,
  );

  const [rows] = await db.query(
    `SELECT produto_id, quantidade, estoque_minimo
     FROM estoque
     WHERE produto_id = ?
     LIMIT 1`,
    [produtoId],
  );

  return rows[0] || null;
}

module.exports = {
  listEstoqueByEmpresa,
  listEstoqueBaixoByEmpresa,
  findProdutoByEmpresa,
  createEstoqueIfMissing,
  updateEstoqueByProdutoId,
};

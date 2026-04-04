const db = require("../config/db");

async function createProduto({
  empresaId,
  nome,
  descricao,
  preco,
  categoria,
  ativo,
}) {
  const [result] = await db.query(
    `INSERT INTO produtos (empresa_id, nome, descricao, preco, categoria, ativo)
		 VALUES (?, ?, ?, ?, ?, ?)`,
    [empresaId, nome, descricao ?? null, preco, categoria ?? null, ativo],
  );

  return {
    id: result.insertId,
    empresa_id: Number(empresaId),
    nome,
    descricao: descricao ?? null,
    preco,
    categoria: categoria ?? null,
    ativo,
  };
}

async function listProdutosByEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT id, empresa_id, nome, descricao, preco, categoria, ativo
		 FROM produtos
		 WHERE empresa_id = ?
		 ORDER BY id DESC`,
    [empresaId],
  );

  return rows;
}

async function updateProdutoByEmpresaAndId({
  empresaId,
  id,
  nome,
  descricao,
  preco,
  categoria,
  ativo,
}) {
  const [result] = await db.query(
    `UPDATE produtos
		 SET nome = ?, descricao = ?, preco = ?, categoria = ?, ativo = ?
		 WHERE id = ? AND empresa_id = ?`,
    [nome, descricao ?? null, preco, categoria ?? null, ativo, id, empresaId],
  );

  return result.affectedRows;
}

async function deleteProdutoByEmpresaAndId({ empresaId, id }) {
  const [result] = await db.query(
    "DELETE FROM produtos WHERE id = ? AND empresa_id = ?",
    [id, empresaId],
  );

  return result.affectedRows;
}

module.exports = {
  createProduto,
  listProdutosByEmpresa,
  updateProdutoByEmpresaAndId,
  deleteProdutoByEmpresaAndId,
};

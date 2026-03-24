const db = require("../config/db");

async function getConnection() {
  return db.getConnection();
}

async function findProdutoParaPedido(connection, empresaId, produtoId) {
  const [rows] = await connection.query(
    `SELECT
      p.id,
      p.empresa_id,
      p.nome,
      p.preco,
      p.ativo,
      COALESCE(e.quantidade, 0) AS quantidade_estoque
     FROM produtos p
     LEFT JOIN estoque e ON e.produto_id = p.id
     WHERE p.id = ? AND p.empresa_id = ?
     LIMIT 1
     FOR UPDATE`,
    [produtoId, empresaId],
  );

  return rows[0] || null;
}

async function insertPedido(connection, pedidoData) {
  const [result] = await connection.query(
    `INSERT INTO pedidos (
      empresa_id,
      cliente_nome,
      telefone,
      tipo_recebimento,
      endereco,
      forma_pagamento,
      troco_para,
      valor_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pedidoData.empresa_id,
      pedidoData.cliente_nome,
      pedidoData.telefone,
      pedidoData.tipo_recebimento,
      pedidoData.endereco,
      pedidoData.forma_pagamento,
      pedidoData.troco_para,
      pedidoData.valor_total,
    ],
  );

  return result.insertId;
}

async function insertItensPedido(connection, pedidoId, itens) {
  const values = itens.map((item) => [
    pedidoId,
    item.produto_id,
    item.quantidade,
    item.preco_unitario,
  ]);

  await connection.query(
    `INSERT INTO itens_pedido (
      pedido_id,
      produto_id,
      quantidade,
      preco_unitario
    ) VALUES ?`,
    [values],
  );
}

async function baixarEstoque(connection, produtoId, quantidade) {
  await connection.query(
    `UPDATE estoque
     SET quantidade = quantidade - ?
     WHERE produto_id = ?`,
    [quantidade, produtoId],
  );
}

async function listPedidosByEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.empresa_id,
      p.cliente_nome,
      p.telefone,
      p.tipo_recebimento,
      p.endereco,
      p.forma_pagamento,
      p.troco_para,
      p.valor_total,
      ip.produto_id,
      ip.quantidade,
      ip.preco_unitario,
      pr.nome AS produto_nome
     FROM pedidos p
     LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
     LEFT JOIN produtos pr ON pr.id = ip.produto_id
     WHERE p.empresa_id = ?
     ORDER BY p.id DESC, ip.id ASC`,
    [empresaId],
  );

  return rows;
}

async function findPedidoByEmpresaAndId(empresaId, id) {
  const [rows] = await db.query(
    `SELECT
      id,
      empresa_id,
      cliente_nome,
      telefone,
      tipo_recebimento,
      endereco,
      forma_pagamento,
      troco_para,
      valor_total,
      status
     FROM pedidos
     WHERE id = ? AND empresa_id = ?
     LIMIT 1`,
    [id, empresaId],
  );

  return rows[0] || null;
}

async function updatePedidoStatusByEmpresaAndId(empresaId, id, status) {
  const [result] = await db.query(
    `UPDATE pedidos
     SET status = ?
     WHERE id = ? AND empresa_id = ?`,
    [status, id, empresaId],
  );

  return result.affectedRows;
}

module.exports = {
  getConnection,
  findProdutoParaPedido,
  insertPedido,
  insertItensPedido,
  baixarEstoque,
  listPedidosByEmpresa,
  findPedidoByEmpresaAndId,
  updatePedidoStatusByEmpresaAndId,
};

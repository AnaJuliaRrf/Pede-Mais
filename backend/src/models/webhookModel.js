const db = require("../config/db");

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [
    columnName,
  ]);

  return rows.length > 0;
}

async function ensureWebhookTable() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS whatsapp_eventos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      id_externo VARCHAR(191) NULL,
      empresa_id BIGINT NULL,
      telefone_origem VARCHAR(32) NULL,
      payload_bruto LONGTEXT NOT NULL,
      status_processamento ENUM('recebido', 'duplicado', 'invalido', 'processado') NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_whatsapp_eventos_id_externo (id_externo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  await db.query(
    `CREATE TABLE IF NOT EXISTS whatsapp_sessoes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      empresa_id BIGINT NOT NULL,
      telefone_origem VARCHAR(32) NOT NULL,
      estado_atual ENUM(
        'aguardando_nome',
        'aguardando_item_menu',
        'aguardando_quantidade_item',
        'aguardando_mais_itens',
        'pronto_para_confirmacao',
        'aguardando_tipo_recebimento',
        'aguardando_endereco_entrega',
        'aguardando_confirmacao_endereco',
        'aguardando_forma_pagamento',
        'aguardando_necessidade_troco',
        'aguardando_troco_para',
        'pronto_para_criar_pedido',
        'aguardando_tratativa_estoque',
        'concluido'
      ) NOT NULL,
      nome_cliente VARCHAR(191) NULL,
      item_menu_pendente BIGINT NULL,
      tipo_recebimento ENUM('entrega', 'retirada') NULL,
      endereco TEXT NULL,
      endereco_confirmado TINYINT(1) NULL,
      forma_pagamento VARCHAR(32) NULL,
      precisa_troco TINYINT(1) NULL,
      troco_para DECIMAL(10,2) NULL,
      pedido_id_criado BIGINT NULL,
      estoque_produto_pendente BIGINT NULL,
      estoque_disponivel_pendente INT NULL,
      ultima_opcao_estoque VARCHAR(16) NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_whatsapp_sessoes_empresa_telefone (empresa_id, telefone_origem)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  await db.query(
    `ALTER TABLE whatsapp_sessoes
     MODIFY COLUMN estado_atual ENUM(
       'aguardando_nome',
       'aguardando_item_menu',
       'aguardando_quantidade_item',
       'aguardando_mais_itens',
       'pronto_para_confirmacao',
       'aguardando_tipo_recebimento',
       'aguardando_endereco_entrega',
       'aguardando_confirmacao_endereco',
       'aguardando_forma_pagamento',
       'aguardando_necessidade_troco',
       'aguardando_troco_para',
       'pronto_para_criar_pedido',
       'aguardando_tratativa_estoque',
       'concluido'
     ) NOT NULL`,
  );

  if (!(await columnExists("whatsapp_sessoes", "tipo_recebimento"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN tipo_recebimento ENUM('entrega', 'retirada') NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "endereco"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN endereco TEXT NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "endereco_confirmado"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN endereco_confirmado TINYINT(1) NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "forma_pagamento"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN forma_pagamento VARCHAR(32) NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "precisa_troco"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN precisa_troco TINYINT(1) NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "troco_para"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN troco_para DECIMAL(10,2) NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "pedido_id_criado"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN pedido_id_criado BIGINT NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "estoque_produto_pendente"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN estoque_produto_pendente BIGINT NULL",
    );
  }

  if (
    !(await columnExists("whatsapp_sessoes", "estoque_disponivel_pendente"))
  ) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN estoque_disponivel_pendente INT NULL",
    );
  }

  if (!(await columnExists("whatsapp_sessoes", "ultima_opcao_estoque"))) {
    await db.query(
      "ALTER TABLE whatsapp_sessoes ADD COLUMN ultima_opcao_estoque VARCHAR(16) NULL",
    );
  }

  await db.query(
    `CREATE TABLE IF NOT EXISTS whatsapp_carrinho_tmp (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      sessao_id BIGINT NOT NULL,
      produto_id BIGINT NOT NULL,
      quantidade INT NOT NULL,
      preco_unitario DECIMAL(10,2) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_whatsapp_carrinho_item (sessao_id, produto_id),
      KEY idx_whatsapp_carrinho_sessao (sessao_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

async function insertEvento({
  id_externo,
  empresa_id,
  telefone_origem,
  payload_bruto,
  status_processamento,
}) {
  await db.query(
    `INSERT INTO whatsapp_eventos (
      id_externo,
      empresa_id,
      telefone_origem,
      payload_bruto,
      status_processamento
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      id_externo ?? null,
      empresa_id ?? null,
      telefone_origem ?? null,
      payload_bruto,
      status_processamento,
    ],
  );
}

async function updateStatusByIdExterno(idExterno, status) {
  const [result] = await db.query(
    `UPDATE whatsapp_eventos
     SET status_processamento = ?
     WHERE id_externo = ?`,
    [status, idExterno],
  );

  return result.affectedRows;
}

async function findByIdExterno(idExterno) {
  const [rows] = await db.query(
    `SELECT
      id,
      id_externo,
      empresa_id,
      telefone_origem,
      payload_bruto,
      status_processamento,
      criado_em,
      atualizado_em
     FROM whatsapp_eventos
     WHERE id_externo = ?
     LIMIT 1`,
    [idExterno],
  );

  return rows[0] || null;
}

async function findSessaoByEmpresaTelefone(empresaId, telefoneOrigem) {
  const [rows] = await db.query(
    `SELECT
      id,
      empresa_id,
      telefone_origem,
      estado_atual,
      nome_cliente,
      item_menu_pendente,
      tipo_recebimento,
      endereco,
      endereco_confirmado,
      forma_pagamento,
      precisa_troco,
      troco_para,
      pedido_id_criado,
      estoque_produto_pendente,
      estoque_disponivel_pendente,
      ultima_opcao_estoque,
      criado_em,
      atualizado_em
     FROM whatsapp_sessoes
     WHERE empresa_id = ? AND telefone_origem = ?
     LIMIT 1`,
    [empresaId, telefoneOrigem],
  );

  return rows[0] || null;
}

async function createSessao({ empresa_id, telefone_origem, estado_atual }) {
  const [result] = await db.query(
    `INSERT INTO whatsapp_sessoes (
      empresa_id,
      telefone_origem,
      estado_atual
    ) VALUES (?, ?, ?)`,
    [empresa_id, telefone_origem, estado_atual],
  );

  return result.insertId;
}

async function updateSessaoById(id, updates) {
  const fields = Object.keys(updates || {});
  if (!fields.length) {
    return 0;
  }

  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const values = fields.map((field) => updates[field]);

  const [result] = await db.query(
    `UPDATE whatsapp_sessoes
     SET ${setClause}
     WHERE id = ?`,
    [...values, id],
  );

  return result.affectedRows;
}

async function clearCarrinhoBySessaoId(sessaoId) {
  await db.query("DELETE FROM whatsapp_carrinho_tmp WHERE sessao_id = ?", [
    sessaoId,
  ]);
}

async function upsertCarrinhoItem({
  sessao_id,
  produto_id,
  quantidade,
  preco_unitario,
}) {
  await db.query(
    `INSERT INTO whatsapp_carrinho_tmp (
      sessao_id,
      produto_id,
      quantidade,
      preco_unitario
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      quantidade = quantidade + VALUES(quantidade),
      preco_unitario = VALUES(preco_unitario)`,
    [sessao_id, produto_id, quantidade, preco_unitario],
  );
}

async function listCarrinhoBySessaoId(sessaoId) {
  const [rows] = await db.query(
    `SELECT
      c.produto_id,
      p.nome AS produto_nome,
      c.quantidade,
      c.preco_unitario
     FROM whatsapp_carrinho_tmp c
     INNER JOIN produtos p ON p.id = c.produto_id
     WHERE c.sessao_id = ?
     ORDER BY c.id ASC`,
    [sessaoId],
  );

  return rows;
}

async function updateCarrinhoItemQuantidade(sessaoId, produtoId, quantidade) {
  const [result] = await db.query(
    `UPDATE whatsapp_carrinho_tmp
     SET quantidade = ?
     WHERE sessao_id = ? AND produto_id = ?`,
    [quantidade, sessaoId, produtoId],
  );

  return result.affectedRows;
}

async function removeCarrinhoItem(sessaoId, produtoId) {
  const [result] = await db.query(
    `DELETE FROM whatsapp_carrinho_tmp
     WHERE sessao_id = ? AND produto_id = ?`,
    [sessaoId, produtoId],
  );

  return result.affectedRows;
}

async function listProdutosAtivosByEmpresa(empresaId) {
  const [rows] = await db.query(
    `SELECT id, nome, preco
     FROM produtos
     WHERE empresa_id = ? AND ativo = 1
     ORDER BY id ASC`,
    [empresaId],
  );

  return rows;
}

async function findProdutoAtivoByEmpresaAndId(empresaId, produtoId) {
  const [rows] = await db.query(
    `SELECT id, nome, preco
     FROM produtos
     WHERE empresa_id = ? AND id = ? AND ativo = 1
     LIMIT 1`,
    [empresaId, produtoId],
  );

  return rows[0] || null;
}

module.exports = {
  ensureWebhookTable,
  insertEvento,
  updateStatusByIdExterno,
  findByIdExterno,
  findSessaoByEmpresaTelefone,
  createSessao,
  updateSessaoById,
  clearCarrinhoBySessaoId,
  upsertCarrinhoItem,
  listCarrinhoBySessaoId,
  updateCarrinhoItemQuantidade,
  removeCarrinhoItem,
  listProdutosAtivosByEmpresa,
  findProdutoAtivoByEmpresaAndId,
};

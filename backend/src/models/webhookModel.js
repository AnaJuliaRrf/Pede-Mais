const db = require("../config/db");

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

module.exports = {
  ensureWebhookTable,
  insertEvento,
  updateStatusByIdExterno,
  findByIdExterno,
};

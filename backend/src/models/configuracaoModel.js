const db = require("../config/db");

async function findConfiguracaoByEmpresaId(empresaId) {
  const [rows] = await db.query(
    `SELECT
      id,
      aceita_entrega,
      aceita_retirada,
      taxa_entrega,
      telefone,
      endereco,
      horario_abertura,
      horario_fechamento
     FROM empresas
     WHERE id = ?
     LIMIT 1`,
    [empresaId],
  );

  return rows[0] || null;
}

async function updateConfiguracaoByEmpresaId(empresaId, updates) {
  const fields = Object.keys(updates);
  if (!fields.length) {
    return 0;
  }

  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const values = fields.map((field) => updates[field]);

  const [result] = await db.query(
    `UPDATE empresas
     SET ${setClause}
     WHERE id = ?`,
    [...values, empresaId],
  );

  return result.affectedRows;
}

module.exports = {
  findConfiguracaoByEmpresaId,
  updateConfiguracaoByEmpresaId,
};

const db = require("../config/db");

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

module.exports = {
  findUsuarioByEmail,
};

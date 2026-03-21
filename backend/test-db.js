const db = require('./src/config/db');

async function testConnection() {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("Banco conectado com sucesso!", rows);
  } catch (err) {
    console.error("Erro ao conectar:", err);
  }
}

testConnection();
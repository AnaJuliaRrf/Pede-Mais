const express = require("express");
const cors = require("cors");
const produtoRoutes = require("./routes/produtoRoutes");
const estoqueRoutes = require("./routes/estoqueRoutes");
const pedidoRoutes = require("./routes/pedidoRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/empresas/:empresaId/produtos", produtoRoutes);
app.use("/empresas/:empresaId/estoque", estoqueRoutes);
app.use("/empresas/:empresaId/pedidos", pedidoRoutes);

module.exports = app;

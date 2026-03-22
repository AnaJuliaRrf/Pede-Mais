const express = require("express");
const cors = require("cors");
const produtoRoutes = require("./routes/produtoRoutes");
const estoqueRoutes = require("./routes/estoqueRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/empresas/:empresaId/produtos", produtoRoutes);
app.use("/empresas/:empresaId/estoque", estoqueRoutes);

module.exports = app;

const estoqueService = require("../services/estoqueService");

async function listEstoque(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await estoqueService.listEstoque(empresaId);
    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function updateEstoque(req, res) {
  try {
    const { empresaId, produtoId } = req.params;
    const result = await estoqueService.updateEstoque(
      empresaId,
      produtoId,
      req.body || {},
    );

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function listEstoqueBaixo(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await estoqueService.listEstoqueBaixo(empresaId);
    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

module.exports = {
  listEstoque,
  updateEstoque,
  listEstoqueBaixo,
};

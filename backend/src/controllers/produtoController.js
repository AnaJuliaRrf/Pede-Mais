const produtoService = require("../services/produtoService");

async function createProduto(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await produtoService.createProduto(empresaId, req.body);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function listProdutos(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await produtoService.listProdutos(empresaId);
    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function updateProduto(req, res) {
  try {
    const { empresaId, id } = req.params;
    const result = await produtoService.updateProduto(empresaId, id, req.body);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function deleteProduto(req, res) {
  try {
    const { empresaId, id } = req.params;
    const result = await produtoService.deleteProduto(empresaId, id);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

module.exports = {
  createProduto,
  listProdutos,
  updateProduto,
  deleteProduto,
};

const pedidoService = require("../services/pedidoService");

async function createPedido(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await pedidoService.createPedido(empresaId, req.body || {});

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function listPedidos(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await pedidoService.listPedidos(empresaId, req.query || {});

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function getPedidoById(req, res) {
  try {
    const { empresaId, id } = req.params;
    const result = await pedidoService.getPedidoById(empresaId, id);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function updatePedidoStatus(req, res) {
  try {
    const { empresaId, id } = req.params;
    const result = await pedidoService.updatePedidoStatus(
      empresaId,
      id,
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

module.exports = {
  createPedido,
  listPedidos,
  getPedidoById,
  updatePedidoStatus,
};

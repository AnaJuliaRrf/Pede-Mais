const configuracaoService = require("../services/configuracaoService");

async function getConfiguracoes(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await configuracaoService.getConfiguracoes(empresaId);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function updateConfiguracoes(req, res) {
  try {
    const { empresaId } = req.params;
    const result = await configuracaoService.updateConfiguracoes(
      empresaId,
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
  getConfiguracoes,
  updateConfiguracoes,
};

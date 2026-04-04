const authService = require("../services/authService");

async function login(req, res) {
  try {
    const result = await authService.login(req.body || {});

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

module.exports = {
  login,
};

function authorizeEmpresa(req, res, next) {
  const { empresaId } = req.params;

  if (!empresaId) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: "token ausente" });
  }

  if (req.user.perfil === "superadmin") {
    return next();
  }

  if (Number(req.user.empresa_id) !== Number(empresaId)) {
    return res.status(403).json({ error: "acesso negado para esta empresa" });
  }

  return next();
}

module.exports = authorizeEmpresa;

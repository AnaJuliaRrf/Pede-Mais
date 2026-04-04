const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "token ausente" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "token ausente" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    req.user = {
      id: Number(decoded.sub),
      empresa_id: decoded.empresa_id,
      perfil: decoded.perfil,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: "token inválido ou expirado" });
  }
}

module.exports = authenticate;

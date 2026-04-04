const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authModel = require("../models/authModel");

function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";

  if (!secret) {
    return { error: "JWT_SECRET não configurado" };
  }

  return { secret, expiresIn };
}

async function login(payload) {
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const senha = typeof payload.senha === "string" ? payload.senha : "";

  if (!email) {
    return { status: 400, error: "email é obrigatório" };
  }

  if (!senha) {
    return { status: 400, error: "senha é obrigatória" };
  }

  const jwtConfig = getJwtConfig();
  if (jwtConfig.error) {
    return { status: 500, error: "erro interno do servidor" };
  }

  const usuario = await authModel.findUsuarioByEmail(email);
  if (!usuario) {
    return { status: 401, error: "credenciais inválidas" };
  }

  let senhaValida = false;
  try {
    senhaValida = await bcrypt.compare(senha, usuario.senha);
  } catch (error) {
    senhaValida = false;
  }

  if (!senhaValida) {
    return { status: 401, error: "credenciais inválidas" };
  }

  const token = jwt.sign(
    {
      empresa_id: usuario.empresa_id,
      perfil: usuario.perfil,
    },
    jwtConfig.secret,
    {
      subject: String(usuario.id),
      expiresIn: jwtConfig.expiresIn,
    },
  );

  return {
    status: 200,
    data: {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        empresa_id: usuario.empresa_id,
      },
    },
  };
}

module.exports = {
  login,
};

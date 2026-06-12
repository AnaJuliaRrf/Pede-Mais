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

async function cadastro(payload) {
  const usuario = {
    nome: typeof payload.nome === "string" ? payload.nome.trim() : "",
    cpf: typeof payload.cpf === "string" ? payload.cpf.trim() : "",
    nascimento:
      typeof payload.nascimento === "string" ? payload.nascimento : "",
    telefone: typeof payload.telefone === "string" ? payload.telefone.trim() : "",
    endereco: typeof payload.endereco === "string" ? payload.endereco.trim() : "",
    cep: typeof payload.cep === "string" ? payload.cep.trim() : "",
    email:
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
    senha: typeof payload.senha === "string" ? payload.senha : "",
  };

  const empresaPayload = payload.empresa || {};
  const empresa = {
    nome:
      typeof empresaPayload.nome === "string" ? empresaPayload.nome.trim() : "",
    cidade:
      typeof empresaPayload.cidade === "string"
        ? empresaPayload.cidade.trim()
        : "",
    endereco:
      typeof empresaPayload.endereco === "string"
        ? empresaPayload.endereco.trim()
        : "",
    numero:
      typeof empresaPayload.numero === "string"
        ? empresaPayload.numero.trim()
        : "",
    documento:
      typeof empresaPayload.documento === "string"
        ? empresaPayload.documento.trim()
        : "",
    cep:
      typeof empresaPayload.cep === "string" ? empresaPayload.cep.trim() : "",
    foco:
      typeof empresaPayload.foco === "string" ? empresaPayload.foco.trim() : "",
    telefone:
      typeof empresaPayload.telefone === "string"
        ? empresaPayload.telefone.trim()
        : "",
    email:
      typeof empresaPayload.email === "string"
        ? empresaPayload.email.trim().toLowerCase()
        : "",
  };

  if (!usuario.nome) {
    return { status: 400, error: "nome é obrigatório" };
  }

  if (!usuario.email) {
    return { status: 400, error: "email é obrigatório" };
  }

  if (!usuario.senha || usuario.senha.length < 6) {
    return { status: 400, error: "senha deve ter pelo menos 6 caracteres" };
  }

  if (!empresa.nome) {
    return { status: 400, error: "nome da empresa é obrigatório" };
  }

  const usuarioExistente = await authModel.findUsuarioByEmail(usuario.email);
  if (usuarioExistente) {
    return { status: 409, error: "email já cadastrado" };
  }

  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  const result = await authModel.createEmpresaAndUsuario({
    empresa,
    usuario: {
      ...usuario,
      senha: senhaHash,
    },
  });

  return {
    status: 201,
    data: {
      usuario: {
        id: result.usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        perfil: "admin",
        empresa_id: result.empresaId,
      },
    },
  };
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
  cadastro,
  login,
};

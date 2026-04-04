const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../../src/app");
const { TEST_PASSWORD, TEST_USERS } = require("./testData");

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, senha = TEST_PASSWORD) {
  return request(app).post("/auth/login").send({ email, senha });
}

async function getTokenByUser(user) {
  const response = await login(user.email, TEST_PASSWORD);

  if (response.status !== 200 || !response.body?.token) {
    throw new Error(`Falha ao autenticar usuário de teste: ${user.email}`);
  }

  return response.body.token;
}

async function getTokenEmpresa1() {
  return getTokenByUser(TEST_USERS.empresa1);
}

async function getTokenEmpresa2() {
  return getTokenByUser(TEST_USERS.empresa2);
}

function buildExpiredToken({
  userId = 9999,
  empresa_id = 1,
  perfil = "admin",
} = {}) {
  const secret = process.env.JWT_SECRET || "test_secret_jwt";

  return jwt.sign({ empresa_id, perfil }, secret, {
    subject: String(userId),
    expiresIn: -10,
  });
}

module.exports = {
  authHeader,
  login,
  getTokenEmpresa1,
  getTokenEmpresa2,
  buildExpiredToken,
};

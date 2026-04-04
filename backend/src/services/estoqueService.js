const estoqueModel = require("../models/estoqueModel");

function validatePatchPayload(payload) {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "quantidade")) {
    const quantidade = Number(payload.quantidade);
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      return { error: "quantidade não pode ser negativa" };
    }
    updates.quantidade = quantidade;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "estoque_minimo")) {
    const estoqueMinimo = Number(payload.estoque_minimo);
    if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
      return { error: "estoque_minimo não pode ser negativo" };
    }
    updates.estoque_minimo = estoqueMinimo;
  }

  return { updates };
}

async function listEstoque(empresaId) {
  const rows = await estoqueModel.listEstoqueByEmpresa(empresaId);
  return { status: 200, data: rows };
}

async function listEstoqueBaixo(empresaId) {
  const rows = await estoqueModel.listEstoqueBaixoByEmpresa(empresaId);
  return { status: 200, data: rows };
}

async function updateEstoque(empresaId, produtoId, payload) {
  const validation = validatePatchPayload(payload);
  if (validation.error) {
    return { status: 400, error: validation.error };
  }

  const produto = await estoqueModel.findProdutoByEmpresa(empresaId, produtoId);
  if (!produto) {
    return { status: 404, error: "produto não encontrado para esta empresa" };
  }

  await estoqueModel.createEstoqueIfMissing(produtoId);
  const row = await estoqueModel.updateEstoqueByProdutoId(
    produtoId,
    validation.updates,
  );

  return {
    status: 200,
    data: {
      produto_id: Number(produtoId),
      empresa_id: Number(empresaId),
      quantidade: row?.quantidade ?? 0,
      estoque_minimo: row?.estoque_minimo ?? 0,
    },
  };
}

module.exports = {
  listEstoque,
  listEstoqueBaixo,
  updateEstoque,
};

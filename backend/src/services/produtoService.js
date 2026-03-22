const produtoModel = require("../models/produtoModel");

function parseAndValidatePayload(payload) {
  const nome = typeof payload.nome === "string" ? payload.nome.trim() : "";
  const preco = Number(payload.preco);

  if (!nome) {
    return { error: "nome é obrigatório" };
  }

  if (!Number.isFinite(preco) || preco <= 0) {
    return { error: "preco deve ser numérico e maior que 0" };
  }

  return {
    data: {
      nome,
      descricao: payload.descricao ?? null,
      preco,
      categoria: payload.categoria ?? null,
      ativo: payload.ativo ?? true,
    },
  };
}

async function createProduto(empresaId, payload) {
  const validation = parseAndValidatePayload(payload);
  if (validation.error) {
    return { status: 400, error: validation.error };
  }

  const created = await produtoModel.createProduto({
    empresaId,
    ...validation.data,
  });
  return { status: 201, data: created };
}

async function listProdutos(empresaId) {
  const rows = await produtoModel.listProdutosByEmpresa(empresaId);
  return { status: 200, data: rows };
}

async function updateProduto(empresaId, id, payload) {
  const validation = parseAndValidatePayload(payload);
  if (validation.error) {
    return { status: 400, error: validation.error };
  }

  const affectedRows = await produtoModel.updateProdutoByEmpresaAndId({
    empresaId,
    id,
    ...validation.data,
  });

  if (!affectedRows) {
    return { status: 404, error: "produto não encontrado" };
  }

  return {
    status: 200,
    data: { id: Number(id), empresa_id: Number(empresaId), ...validation.data },
  };
}

async function deleteProduto(empresaId, id) {
  const affectedRows = await produtoModel.deleteProdutoByEmpresaAndId({
    empresaId,
    id,
  });

  if (!affectedRows) {
    return { status: 404, error: "produto não encontrado" };
  }

  return { status: 200, data: { message: "produto removido com sucesso" } };
}

module.exports = {
  createProduto,
  listProdutos,
  updateProduto,
  deleteProduto,
};

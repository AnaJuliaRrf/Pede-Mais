const configuracaoModel = require("../models/configuracaoModel");

const FORMAS_PAGAMENTO_FIXAS = ["dinheiro", "cartao", "pix"];

function isValidTimeHms(value) {
  return /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value);
}

function formatConfiguracao(data) {
  return {
    empresa_id: data.id,
    aceita_entrega: Boolean(data.aceita_entrega),
    aceita_retirada: Boolean(data.aceita_retirada),
    taxa_entrega: Number(data.taxa_entrega),
    telefone: data.telefone,
    endereco: data.endereco,
    horario_abertura: data.horario_abertura,
    horario_fechamento: data.horario_fechamento,
    formas_pagamento_aceitas: FORMAS_PAGAMENTO_FIXAS,
  };
}

function validatePatchPayload(payload, currentConfig) {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "aceita_entrega")) {
    if (typeof payload.aceita_entrega !== "boolean") {
      return { error: "aceita_entrega deve ser boolean" };
    }
    updates.aceita_entrega = payload.aceita_entrega;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "aceita_retirada")) {
    if (typeof payload.aceita_retirada !== "boolean") {
      return { error: "aceita_retirada deve ser boolean" };
    }
    updates.aceita_retirada = payload.aceita_retirada;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "taxa_entrega")) {
    const taxaEntrega = Number(payload.taxa_entrega);
    if (!Number.isFinite(taxaEntrega) || taxaEntrega < 0) {
      return { error: "taxa_entrega não pode ser negativa" };
    }
    updates.taxa_entrega = taxaEntrega;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "telefone")) {
    if (payload.telefone != null && typeof payload.telefone !== "string") {
      return { error: "telefone deve ser string" };
    }
    updates.telefone =
      payload.telefone == null ? null : payload.telefone.trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "endereco")) {
    if (payload.endereco != null && typeof payload.endereco !== "string") {
      return { error: "endereco deve ser string" };
    }
    updates.endereco =
      payload.endereco == null ? null : payload.endereco.trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "horario_abertura")) {
    if (
      payload.horario_abertura != null &&
      typeof payload.horario_abertura !== "string"
    ) {
      return { error: "horario_abertura deve ser string no formato HH:MM:SS" };
    }

    if (payload.horario_abertura && !isValidTimeHms(payload.horario_abertura)) {
      return { error: "horario_abertura deve estar no formato HH:MM:SS" };
    }

    updates.horario_abertura = payload.horario_abertura || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "horario_fechamento")) {
    if (
      payload.horario_fechamento != null &&
      typeof payload.horario_fechamento !== "string"
    ) {
      return {
        error: "horario_fechamento deve ser string no formato HH:MM:SS",
      };
    }

    if (
      payload.horario_fechamento &&
      !isValidTimeHms(payload.horario_fechamento)
    ) {
      return { error: "horario_fechamento deve estar no formato HH:MM:SS" };
    }

    updates.horario_fechamento = payload.horario_fechamento || null;
  }

  const aceitaEntregaFinal = Object.prototype.hasOwnProperty.call(
    updates,
    "aceita_entrega",
  )
    ? updates.aceita_entrega
    : Boolean(currentConfig.aceita_entrega);

  const aceitaRetiradaFinal = Object.prototype.hasOwnProperty.call(
    updates,
    "aceita_retirada",
  )
    ? updates.aceita_retirada
    : Boolean(currentConfig.aceita_retirada);

  if (!aceitaEntregaFinal && !aceitaRetiradaFinal) {
    return {
      error:
        "aceita_entrega e aceita_retirada não podem ser false ao mesmo tempo",
    };
  }

  return { updates };
}

async function getConfiguracoes(empresaId) {
  const config = await configuracaoModel.findConfiguracaoByEmpresaId(empresaId);

  if (!config) {
    return { status: 404, error: "empresa não encontrada" };
  }

  return { status: 200, data: formatConfiguracao(config) };
}

async function updateConfiguracoes(empresaId, payload) {
  const configAtual =
    await configuracaoModel.findConfiguracaoByEmpresaId(empresaId);

  if (!configAtual) {
    return { status: 404, error: "empresa não encontrada" };
  }

  const validation = validatePatchPayload(payload || {}, configAtual);
  if (validation.error) {
    return { status: 400, error: validation.error };
  }

  await configuracaoModel.updateConfiguracaoByEmpresaId(
    empresaId,
    validation.updates,
  );
  const configAtualizada =
    await configuracaoModel.findConfiguracaoByEmpresaId(empresaId);

  return { status: 200, data: formatConfiguracao(configAtualizada) };
}

module.exports = {
  getConfiguracoes,
  updateConfiguracoes,
};

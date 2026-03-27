const webhookModel = require("../models/webhookModel");

function verifyChallenge(query) {
  const mode =
    typeof query["hub.mode"] === "string" ? query["hub.mode"].trim() : "";
  const verifyToken =
    typeof query["hub.verify_token"] === "string"
      ? query["hub.verify_token"].trim()
      : "";
  const challenge =
    typeof query["hub.challenge"] === "string" ? query["hub.challenge"] : "";

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "test_verify_token";

  if (mode !== "subscribe" || !challenge || verifyToken !== expectedToken) {
    return { status: 403, error: "verificação inválida" };
  }

  return { challenge };
}

function extractEventData(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : null;
  if (!safePayload) {
    return {
      invalid: true,
      empresa_id: null,
      telefone_origem: null,
      id_externo: null,
    };
  }

  const entry = Array.isArray(safePayload.entry) ? safePayload.entry[0] : null;
  const change =
    entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
  const value = change?.value || null;
  const message =
    value && Array.isArray(value.messages) ? value.messages[0] : null;

  const rawIdExterno =
    safePayload.id_externo || safePayload.event_id || message?.id || null;

  const id_externo =
    typeof rawIdExterno === "string" && rawIdExterno.trim()
      ? rawIdExterno.trim()
      : null;

  const rawTelefone = safePayload.telefone_origem || message?.from || null;
  const telefone_origem =
    typeof rawTelefone === "string" && rawTelefone.trim()
      ? rawTelefone.trim()
      : null;

  const empresaBruta = safePayload.empresa_id;
  const empresaNumero = Number(empresaBruta);
  const empresa_id =
    Number.isInteger(empresaNumero) && empresaNumero > 0 ? empresaNumero : null;

  return {
    invalid: !id_externo,
    id_externo,
    empresa_id,
    telefone_origem,
  };
}

async function receiveEvent(payload) {
  await webhookModel.ensureWebhookTable();

  const payloadBruto = JSON.stringify(payload ?? null);
  const extracted = extractEventData(payload);

  if (extracted.invalid) {
    await webhookModel.insertEvento({
      id_externo: null,
      empresa_id: extracted.empresa_id,
      telefone_origem: extracted.telefone_origem,
      payload_bruto: payloadBruto,
      status_processamento: "invalido",
    });

    return { status: 400, error: "payload inválido" };
  }

  try {
    await webhookModel.insertEvento({
      id_externo: extracted.id_externo,
      empresa_id: extracted.empresa_id,
      telefone_origem: extracted.telefone_origem,
      payload_bruto: payloadBruto,
      status_processamento: "recebido",
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      await webhookModel.updateStatusByIdExterno(
        extracted.id_externo,
        "duplicado",
      );

      return {
        status: 200,
        data: {
          status: "duplicado",
          id_externo: extracted.id_externo,
        },
      };
    }

    throw error;
  }

  await webhookModel.updateStatusByIdExterno(
    extracted.id_externo,
    "processado",
  );

  return {
    status: 200,
    data: {
      status: "processado",
      id_externo: extracted.id_externo,
    },
  };
}

module.exports = {
  verifyChallenge,
  receiveEvent,
};

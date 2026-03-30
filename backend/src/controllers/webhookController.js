const webhookService = require("../services/webhookService");
const crypto = require("crypto");

function ensureCorrelationId(req) {
  const incoming = req.headers["x-correlation-id"];
  if (typeof incoming === "string" && incoming.trim()) {
    return incoming.trim();
  }

  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function verifyWebhook(req, res) {
  const correlationId = ensureCorrelationId(req);
  res.setHeader("x-correlation-id", correlationId);

  try {
    const result = webhookService.verifyChallenge(req.query || {});

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).send(result.challenge);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

async function receiveWebhookEvent(req, res) {
  const correlationId = ensureCorrelationId(req);
  res.setHeader("x-correlation-id", correlationId);

  try {
    const result = await webhookService.receiveEvent(req.body, {
      correlationId,
      headers: req.headers || {},
      rawBody:
        typeof req.rawBody === "string"
          ? req.rawBody
          : JSON.stringify(req.body ?? null),
      origin:
        req.headers["x-forwarded-for"] ||
        req.ip ||
        req.socket?.remoteAddress ||
        "desconhecida",
    });

    if (result.error) {
      return res.status(result.status).json({
        error: result.error,
        code: result.code || "WEBHOOK_ERROR",
        correlation_id: correlationId,
      });
    }

    return res.status(result.status).json({
      ...result.data,
      correlation_id: correlationId,
    });
  } catch (error) {
    return res.status(500).json({
      error: "erro interno do servidor",
      code: "WEBHOOK_INTERNAL_ERROR",
      correlation_id: correlationId,
    });
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhookEvent,
};

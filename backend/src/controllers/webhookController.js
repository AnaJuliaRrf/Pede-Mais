const webhookService = require("../services/webhookService");

async function verifyWebhook(req, res) {
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
  try {
    const result = await webhookService.receiveEvent(req.body);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: "erro interno do servidor" });
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhookEvent,
};

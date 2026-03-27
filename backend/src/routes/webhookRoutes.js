const express = require("express");
const webhookController = require("../controllers/webhookController");

const router = express.Router();

router.get("/", webhookController.verifyWebhook);
router.post("/", webhookController.receiveWebhookEvent);

module.exports = router;

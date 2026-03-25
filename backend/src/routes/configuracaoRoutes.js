const express = require("express");
const configuracaoController = require("../controllers/configuracaoController");

const router = express.Router({ mergeParams: true });

router.get("/", configuracaoController.getConfiguracoes);
router.patch("/", configuracaoController.updateConfiguracoes);

module.exports = router;

const express = require("express");
const configuracaoController = require("../controllers/configuracaoController");
const authenticate = require("../middlewares/authenticate");
const authorizeEmpresa = require("../middlewares/authorizeEmpresa");

const router = express.Router({ mergeParams: true });

router.use(authenticate, authorizeEmpresa);

router.get("/", configuracaoController.getConfiguracoes);
router.patch("/", configuracaoController.updateConfiguracoes);

module.exports = router;

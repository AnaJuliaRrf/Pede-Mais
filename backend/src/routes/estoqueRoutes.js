const express = require("express");
const estoqueController = require("../controllers/estoqueController");
const authenticate = require("../middlewares/authenticate");
const authorizeEmpresa = require("../middlewares/authorizeEmpresa");

const router = express.Router({ mergeParams: true });

router.use(authenticate, authorizeEmpresa);

router.get("/", estoqueController.listEstoque);
router.patch("/:produtoId", estoqueController.updateEstoque);
router.get("/baixo", estoqueController.listEstoqueBaixo);

module.exports = router;

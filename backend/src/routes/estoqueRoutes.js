const express = require("express");
const estoqueController = require("../controllers/estoqueController");

const router = express.Router({ mergeParams: true });

router.get("/", estoqueController.listEstoque);
router.patch("/:produtoId", estoqueController.updateEstoque);
router.get("/baixo", estoqueController.listEstoqueBaixo);

module.exports = router;

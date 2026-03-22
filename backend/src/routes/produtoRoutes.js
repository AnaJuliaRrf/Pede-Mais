const express = require("express");
const produtoController = require("../controllers/produtoController");

const router = express.Router({ mergeParams: true });

router.post("/", produtoController.createProduto);
router.get("/", produtoController.listProdutos);
router.put("/:id", produtoController.updateProduto);
router.delete("/:id", produtoController.deleteProduto);

module.exports = router;

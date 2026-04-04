const express = require("express");
const produtoController = require("../controllers/produtoController");
const authenticate = require("../middlewares/authenticate");
const authorizeEmpresa = require("../middlewares/authorizeEmpresa");

const router = express.Router({ mergeParams: true });

router.get("/", produtoController.listProdutos);
router.post(
  "/",
  authenticate,
  authorizeEmpresa,
  produtoController.createProduto,
);
router.put(
  "/:id",
  authenticate,
  authorizeEmpresa,
  produtoController.updateProduto,
);
router.delete(
  "/:id",
  authenticate,
  authorizeEmpresa,
  produtoController.deleteProduto,
);

module.exports = router;

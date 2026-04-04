const express = require("express");
const pedidoController = require("../controllers/pedidoController");
const authenticate = require("../middlewares/authenticate");
const authorizeEmpresa = require("../middlewares/authorizeEmpresa");

const router = express.Router({ mergeParams: true });

router.post("/", pedidoController.createPedido);
router.get("/", authenticate, authorizeEmpresa, pedidoController.listPedidos);
router.get(
  "/:id",
  authenticate,
  authorizeEmpresa,
  pedidoController.getPedidoById,
);
router.patch(
  "/:id/status",
  authenticate,
  authorizeEmpresa,
  pedidoController.updatePedidoStatus,
);

module.exports = router;

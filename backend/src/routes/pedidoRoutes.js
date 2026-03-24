const express = require("express");
const pedidoController = require("../controllers/pedidoController");

const router = express.Router({ mergeParams: true });

router.post("/", pedidoController.createPedido);
router.get("/", pedidoController.listPedidos);
router.patch("/:id/status", pedidoController.updatePedidoStatus);

module.exports = router;

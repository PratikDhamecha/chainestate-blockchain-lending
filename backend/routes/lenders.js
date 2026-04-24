const express = require("express");
const router = express.Router();
const lenderController = require("../controllers/lenderController");

router.get("/:address", lenderController.getLenderPortfolio);

module.exports = router;

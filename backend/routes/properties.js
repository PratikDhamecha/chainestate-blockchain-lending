const express = require("express");
const router  = express.Router();
const Property = require("../models/Property");
const { propertyContract } = require("../services/blockchain");

// ── GET /api/properties
router.get("/", async (req, res, next) => {
  try {
    const props = await Property.find().sort({ propertyId: 1 });
    res.json({ success: true, data: props });
  } catch (err) { next(err); }
});

// ── GET /api/properties/:id
router.get("/:id", async (req, res, next) => {
  try {
    const prop = await Property.findOne({ propertyId: req.params.id });
    if (!prop) return res.status(404).json({ error: "Property not found" });
    res.json({ success: true, data: prop });
  } catch (err) { next(err); }
});

// ── POST /api/properties  — record after mintProperty tx
//    Body: { owner, shares, txHash, metadata? }
router.post("/", async (req, res, next) => {
  try {
    const { owner, shares, txHash, metadata } = req.body;

    const propertyId = Number(await propertyContract.propertyCounter());

    const prop = await Property.create({
      propertyId,
      owner:        owner.toLowerCase(),
      totalShares:  Number(shares),
      lockedShares: 0,
      txHash,
      metadata: metadata || {},
    });

    res.status(201).json({ success: true, data: prop });
  } catch (err) { next(err); }
});

// ── PATCH /api/properties/:id/lock  — update locked shares when loan is requested
//    Body: { delta }  (positive = lock, negative = release)
router.patch("/:id/lock", async (req, res, next) => {
  try {
    const { delta } = req.body;
    const prop = await Property.findOne({ propertyId: req.params.id });
    if (!prop) return res.status(404).json({ error: "Property not found" });

    prop.lockedShares = Math.max(0, prop.lockedShares + Number(delta));
    await prop.save();

    res.json({ success: true, data: prop });
  } catch (err) { next(err); }
});

module.exports = router;

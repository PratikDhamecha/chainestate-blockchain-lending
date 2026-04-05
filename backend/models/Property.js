const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    propertyId:  { type: Number, unique: true },
    owner:       { type: String, required: true, lowercase: true },
    totalShares: { type: Number, required: true },
    lockedShares:{ type: Number, default: 0 },
    txHash:      { type: String },
    metadata: {
      name:        { type: String, default: "" },
      location:    { type: String, default: "" },
      description: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

propertySchema.virtual("freeShares").get(function () {
  return this.totalShares - this.lockedShares;
});

module.exports = mongoose.model("Property", propertySchema);

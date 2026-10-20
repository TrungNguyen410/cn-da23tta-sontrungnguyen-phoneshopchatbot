const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    value: { type: Number, default: 0, min: 0 },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

module.exports = mongoose.model('OrderCounter', orderCounterSchema);

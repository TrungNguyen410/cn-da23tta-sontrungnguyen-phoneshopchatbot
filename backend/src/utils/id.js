const mongoose = require('mongoose');

const createId = () => new mongoose.Types.ObjectId().toString();

module.exports = { createId };

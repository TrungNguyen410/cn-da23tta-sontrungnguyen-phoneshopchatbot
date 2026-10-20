const BaseRepository = require('./baseRepository');
const OrderItem = require('../models/OrderItem');

module.exports = new BaseRepository(OrderItem);

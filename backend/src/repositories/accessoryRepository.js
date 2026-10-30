const StockedRepository = require('./stockedRepository');
const Accessory = require('../models/Accessory');

class AccessoryRepository extends StockedRepository {}

module.exports = new AccessoryRepository(Accessory);

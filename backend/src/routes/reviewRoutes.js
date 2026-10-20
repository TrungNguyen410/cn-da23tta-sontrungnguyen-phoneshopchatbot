const express = require('express');
const reviewController = require('../controllers/reviewController');
const validators = require('../validators/reviewValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

router.get('/', reviewController.listPublic);
router.get('/product/:productId', validators.productId, validate, reviewController.getByProduct);
router.get('/accessory/:accessoryId', validators.accessoryId, validate, reviewController.getByAccessory);
router.post('/', protect, validators.create, validate, reviewController.create);
router.put('/:id', adminOnly, idParam, validators.update, validate, reviewController.update);
router.delete('/:id', adminOnly, idParam, validate, reviewController.remove);

module.exports = router;

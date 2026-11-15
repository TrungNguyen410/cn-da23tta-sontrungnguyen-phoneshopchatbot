const express = require('express');
const voucherController = require('../controllers/voucherController');
const validators = require('../validators/voucherValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, optionalProtect, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

// A signed-in customer may also check the gift vouchers assigned to them.
router.post('/check', optionalProtect, validators.check, validate, voucherController.validateVoucher);
router.post('/validate', optionalProtect, validators.check, validate, voucherController.validateVoucher);
router.get('/mine', protect, voucherController.mine);
router.get('/', adminOnly, voucherController.list);
router.get('/:id', adminOnly, idParam, validate, voucherController.getById);
router.post('/', adminOnly, validators.create, validate, voucherController.create);
router.put('/:id', adminOnly, idParam, validators.update, validate, voucherController.update);
router.delete('/:id', adminOnly, idParam, validate, voucherController.remove);

module.exports = router;

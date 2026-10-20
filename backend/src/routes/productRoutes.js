const express = require('express');
const createCrudController = require('../controllers/crudController');
const { productService } = require('../services');
const validators = require('../validators/catalogValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const controller = createCrudController(productService, 'Product');
const adminOnly = [protect, authorize('admin')];

router.get('/', validators.list, validate, controller.listPublic);
router.get('/:id', idParam, validate, controller.getPublicById);
router.post('/', adminOnly, validators.create, validate, controller.create);
router.put('/:id', adminOnly, idParam, validators.update, validate, controller.update);
router.delete('/:id', adminOnly, idParam, validate, controller.remove);

module.exports = router;

const express = require('express');
const createCrudController = require('../controllers/crudController');
const { brandService } = require('../services');
const validators = require('../validators/taxonomyValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const controller = createCrudController(brandService, 'Brand');
const adminOnly = [protect, authorize('admin')];

router.get('/', controller.list);
router.get('/:id', idParam, validate, controller.getById);
router.post('/', adminOnly, validators.create, validate, controller.create);
router.put('/:id', adminOnly, idParam, validators.update, validate, controller.update);
router.delete('/:id', adminOnly, idParam, validate, controller.remove);

module.exports = router;

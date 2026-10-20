const express = require('express');
const createCrudController = require('../controllers/crudController');
const { contactService } = require('../services');
const validators = require('../validators/contactValidators');
const { idParam } = require('../validators/commonValidators');
const validate = require('../middlewares/validate');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();
const controller = createCrudController(contactService, 'Contact');
const adminOnly = [protect, authorize('admin')];

router.post('/', validators.create, validate, controller.create);
router.get('/', adminOnly, controller.list);
router.get('/:id', adminOnly, idParam, validate, controller.getById);
router.put('/:id', adminOnly, idParam, validators.update, validate, controller.update);
router.delete('/:id', adminOnly, idParam, validate, controller.remove);

module.exports = router;

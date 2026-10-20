const express = require('express');
const uploadController = require('../controllers/uploadController');
const { upload, validateImageContent } = require('../middlewares/uploadMiddleware');
const { authorize, protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/admin', protect, authorize('admin'), upload.single('adminImage'), validateImageContent, uploadController.uploadSingle);
router.post('/products', protect, authorize('admin'), upload.single('productImage'), validateImageContent, uploadController.uploadSingle);
router.post('/banners', protect, authorize('admin'), upload.single('bannerImage'), validateImageContent, uploadController.uploadSingle);
router.post('/avatar', protect, upload.single('avatar'), validateImageContent, uploadController.uploadSingle);
router.post('/reviews', protect, upload.single('reviewImage'), validateImageContent, uploadController.uploadSingle);

module.exports = router;

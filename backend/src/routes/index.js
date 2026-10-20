const express = require('express');
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const accessoryRoutes = require('./accessoryRoutes');
const categoryRoutes = require('./categoryRoutes');
const brandRoutes = require('./brandRoutes');
const orderRoutes = require('./orderRoutes');
const reviewRoutes = require('./reviewRoutes');
const voucherRoutes = require('./voucherRoutes');
const bannerRoutes = require('./bannerRoutes');
const contactRoutes = require('./contactRoutes');
const settingRoutes = require('./settingRoutes');
const uploadRoutes = require('./uploadRoutes');
const adminRoutes = require('./adminRoutes');
const paymentRoutes = require('./paymentRoutes');
const seoRoutes = require('./seoRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/accessories', accessoryRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/banners', bannerRoutes);
router.use('/contacts', contactRoutes);
router.use('/settings', settingRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/seo', seoRoutes);

module.exports = router;

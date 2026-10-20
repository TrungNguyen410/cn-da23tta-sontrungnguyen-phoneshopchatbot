require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/database');
const Product = require('../models/Product');
const Accessory = require('../models/Accessory');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const slugify = require('../utils/slugify');

async function taxonomyId(Model, name) {
  const namePattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  let entry = await Model.findOne({ name: namePattern });
  if (entry && (entry.isDeleted || !entry.active)) {
    entry = await Model.findOneAndUpdate(
      { _id: entry._id },
      { active: true, isDeleted: false, deletedAt: null },
      { returnDocument: 'after' },
    );
  }
  if (!entry) {
    entry = await Model.create({
      _id: `${Model.modelName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      slug: slugify(name),
      active: true,
    });
  }
  return entry._id;
}

async function migrate(Model) {
  const items = await Model.collection.find({ isDeleted: { $ne: true } }).toArray();
  for (const item of items) {
    if ((!item.brandId && !item.brand) || (!item.categoryId && !item.category)) {
      throw new Error(`Không thể di chuyển ${Model.modelName} ${item._id}: thiếu tên phân loại`);
    }
    const brandId = item.brandId || await taxonomyId(Brand, item.brand);
    const categoryId = item.categoryId || await taxonomyId(Category, item.category);
    await Model.collection.updateOne(
      { _id: item._id },
      { $set: { brandId, categoryId }, $unset: { brand: '', category: '' } },
    );
  }
}

async function run() {
  await connectDB();
  await migrate(Product);
  await migrate(Accessory);
  await disconnectDB();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error(error);
    await disconnectDB();
    process.exit(1);
  });
}

module.exports = { migrate, run, taxonomyId };

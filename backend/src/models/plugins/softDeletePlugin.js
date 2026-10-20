const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  schema.methods.softDelete = function softDelete() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.statics.notDeletedFilter = function notDeletedFilter(filter = {}) {
    return { ...filter, isDeleted: false };
  };
};

module.exports = softDeletePlugin;

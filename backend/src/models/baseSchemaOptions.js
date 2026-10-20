const { createId } = require('../utils/id');

const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      return ret;
    },
  },
};

const stringId = {
  type: String,
  default: createId,
};

module.exports = { baseSchemaOptions, stringId };

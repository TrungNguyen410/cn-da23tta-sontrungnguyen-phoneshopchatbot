module.exports = (payload, fields) => Object.fromEntries(
  fields
    .filter((field) => Object.hasOwn(payload || {}, field))
    .map((field) => [field, payload[field]]),
);

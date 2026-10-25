// Order numbers are "TP" + yymmdd + a daily sequence of 4+ digits (older seeds use shorter ones).
// No left boundary: banks sometimes glue the transfer content together ("thanhtoanTP2610210001").
// The right boundary keeps "TP26102510000" (order 10000) from being read as order 1000.
const ORDER_NUMBER_PATTERN = /TP\d{6,12}(?!\d)/i;

const extractOrderNumber = (...texts) => {
  const match = ORDER_NUMBER_PATTERN.exec(texts.filter(Boolean).join(' '));
  return match ? match[0].toUpperCase() : '';
};

module.exports = { ORDER_NUMBER_PATTERN, extractOrderNumber };

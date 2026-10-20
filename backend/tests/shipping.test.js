const orderService = require('../src/services/orderService');

describe('server-side shipping quotes', () => {
  it('never trusts the client shipping amount and applies configured zones', () => {
    expect(orderService.shippingQuote({ province: 'TP. Hồ Chí Minh' }, 1000000)).toEqual({ fee: 20000, days: 1 });
    expect(orderService.shippingQuote({ province: 'Hà Nội' }, 1000000)).toEqual({ fee: 30000, days: 2 });
    expect(orderService.shippingQuote({ province: 'An Giang' }, 1000000)).toEqual({ fee: 40000, days: 4 });
    expect(orderService.shippingQuote({ province: 'An Giang' }, 10000000)).toEqual({ fee: 0, days: 1 });
  });
});

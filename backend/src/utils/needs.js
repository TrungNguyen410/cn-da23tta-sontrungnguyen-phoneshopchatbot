// Customer needs ("pin trâu", "chụp ảnh đẹp"...) read from accent-stripped text, and how each need ranks phones.

const NEED_WORDS = {
  battery: ['pin trau', 'pin khoe', 'pin lau', 'pin tot', 'pin ben', 'dung lau'],
  camera: ['chup anh', 'chup hinh', 'camera', 'quay phim', 'selfie'],
  gaming: ['choi game', 'game', 'hieu nang', 'cau hinh manh', 'manh'],
  big_screen: ['man hinh lon', 'man hinh to', 'man lon', 'man to', 'xem phim'],
  compact: ['nho gon', 'gon nhe', 'cam vua tay', 'mot tay'],
};

const NEED_LABELS = {
  battery: 'pin trâu',
  camera: 'chụp ảnh đẹp',
  gaming: 'chơi game',
  big_screen: 'màn hình lớn',
  compact: 'nhỏ gọn',
};

const hasPhrase = (text, phrase) => new RegExp(`(^|[^a-z0-9])${phrase}($|[^a-z0-9])`).test(text);

// The first need found in the order of NEED_WORDS.
const parseNeed = (normalizedText) => {
  const text = String(normalizedText || '');
  const found = Object.entries(NEED_WORDS).find(([, words]) => words.some((word) => hasPhrase(text, word)));
  return found ? found[0] : null;
};

const numberIn = (value) => {
  const match = /\d+(?:\.\d+)?/.exec(String(value || ''));
  return match ? Number(match[0]) : 0;
};

// Higher score = better fit for the need.
const SCORES = {
  battery: (phone) => numberIn(phone.battery),
  camera: (phone) => numberIn(phone.camera),
  gaming: (phone) => numberIn(phone.ram) * 1e9 + Number(phone.price || 0),
  big_screen: (phone) => numberIn(phone.screen),
  compact: (phone) => -numberIn(phone.screen),
};

const rankByNeed = (phones, need) => {
  const score = SCORES[need];
  if (!score) return [...phones];
  return phones
    .map((phone, index) => ({ phone, index, value: score(phone) }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map(({ phone }) => phone);
};

const DETAILS = {
  battery: (phone) => phone.battery && `pin ${phone.battery}`,
  camera: (phone) => phone.camera && `camera ${phone.camera}`,
  gaming: (phone) => phone.ram && `RAM ${phone.ram}`,
  big_screen: (phone) => phone.screen && `màn hình ${phone.screen}`,
  compact: (phone) => phone.screen && `màn hình ${phone.screen}`,
};

// The spec line shown first in an answer, e.g. "pin 5340 mAh" for a battery question.
const needDetail = (phone, need) => (DETAILS[need] ? DETAILS[need](phone) || '' : '');

const NEEDS = Object.keys(NEED_WORDS);

module.exports = { NEEDS, NEED_LABELS, NEED_WORDS, needDetail, parseNeed, rankByNeed };

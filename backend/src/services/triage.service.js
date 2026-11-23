// Order matters: the first matching rule wins (spec T-B1).
const CATEGORY_RULES = [
  ['BILLING',  ['refund', 'invoice', 'charge', 'payment']],
  ['LOGIN',    ['password', '2fa', 'sign in', 'locked out', 'login']],
  ['DELIVERY', ['package', 'arrived', 'shipping', 'tracking', 'delivery']],
  ['BUG',      ['crash', 'error', '500', 'exception', 'broken']],
];
const PRIORITY_RULES = [
  ['URGENT', ['urgent', 'production down', 'locked out']],
  ['HIGH',   ['error', 'refund', 'not arrived']],
];

function hasKeyword(text, keyword) {
  // '500' must not match inside "$1500" or "5000", so require non-digits around it
  if (keyword === '500') return /(?<!\d)500(?!\d)/.test(text);
  return text.includes(keyword);
}

function firstMatch(rules, text) {
  const hit = rules.find(([, keywords]) => keywords.some((k) => hasKeyword(text, k)));
  return hit ? hit[0] : null;
}

export function classify(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  return {
    category: firstMatch(CATEGORY_RULES, text) ?? 'FEATURE_REQUEST',
    priority: firstMatch(PRIORITY_RULES, text) ?? 'MEDIUM',
  };
}
class Normalizer {
  normalizeToken(token) {
    if (!token || typeof token !== 'string') return '';
    return token
      .toLowerCase()
      .replace(/^[^\w]+|[^\w]+$/g, '')
      .replace(/[^\w]/g, '');
  }

  normalizeQueryTerm(term) {
    if (!term || typeof term !== 'string') return '';
    return term
      .toLowerCase()
      .trim()
      .replace(/^[^\w*?]+|[^\w*?]+$/g, '');
  }

  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.toLowerCase().trim();
  }
}

module.exports = Normalizer;
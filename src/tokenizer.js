class Tokenizer {
  constructor() {
    this.wordRegex = /[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?/g;
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    const tokens = [];
    let match;
    let position = 0;
    this.wordRegex.lastIndex = 0;

    while ((match = this.wordRegex.exec(text)) !== null) {
      tokens.push({
        token: match[0],
        position: position++
      });
    }
    return tokens;
  }
}

module.exports = Tokenizer;
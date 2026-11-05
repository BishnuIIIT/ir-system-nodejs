const fs = require('fs');
const path = require('path');

class DocumentLoader {
  constructor(documentsDir) {
    this.documentsDir = documentsDir;
  }

  loadDocuments() {
    try {
      if (!fs.existsSync(this.documentsDir)) {
        throw new Error(`Documents directory does not exist: ${this.documentsDir}`);
      }
      const files = fs.readdirSync(this.documentsDir);
      const txtFiles = files.filter(f => f.toLowerCase().endsWith('.txt')).sort();
      const documents = [];

      for (const file of txtFiles) {
        try {
          const filePath = path.join(this.documentsDir, file);
          const rawContent = fs.readFileSync(filePath, 'utf-8');
          const cleanName = file.replace(/\.txt$/i, '').replace(/^doc\d+_/, '').replace(/_/g, ' ');
          const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

          documents.push({
            id: file,
            filename: file,
            title: title,
            content: rawContent.trim(),
            path: filePath
          });
        } catch (fileErr) {
          console.error(`[DocumentLoader] Failed to read ${file}: ${fileErr.message}`);
        }
      }
      console.log(`[DocumentLoader] Loaded ${documents.length} documents.`);
      return documents;
    } catch (err) {
      console.error(`[DocumentLoader] Error: ${err.message}`);
      throw err;
    }
  }
}

module.exports = DocumentLoader;
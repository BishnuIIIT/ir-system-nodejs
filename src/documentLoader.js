const fs = require('fs');
const path = require('path');

class DocumentLoader {
  /**
   * @param {string} documentsDir - Directory containing sample .txt documents
   */
  constructor(documentsDir) {
    this.documentsDir = documentsDir;
  }

  /**
   * Loads sample .txt files from the documents directory.
   * Marks them as permanent sample documents (canDelete: false).
   * @returns {Array<{ id: string, filename: string, title: string, content: string, path: string, isSample: boolean, canDelete: boolean, uploadDate: string }>}
   */
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
            path: filePath,
            isSample: true,
            canDelete: false,
            fileType: 'txt',
            uploadDate: 'Pre-indexed Sample',
            fileSize: fs.statSync(filePath).size
          });
        } catch (fileErr) {
          console.error(`[DocumentLoader] Failed to read ${file}: ${fileErr.message}`);
        }
      }
      console.log(`[DocumentLoader] Loaded ${documents.length} sample documents.`);
      return documents;
    } catch (err) {
      console.error(`[DocumentLoader] Error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Loads previously uploaded PDF files from uploadsDir on server startup.
   * @param {string} uploadsDir
   * @param {import('./pdfProcessor')} pdfProcessor
   * @returns {Promise<Array<Object>>}
   */
  async loadUploadedPdfDocuments(uploadsDir, pdfProcessor) {
    if (!fs.existsSync(uploadsDir)) {
      return [];
    }

    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const pdfDocs = [];

    for (const file of pdfFiles) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        const extraction = await pdfProcessor.extractText(filePath);

        // Derive clean title from filename
        const cleanTitle = file.replace(/^\d+[-_]/, '').replace(/\.pdf$/i, '').replace(/_/g, ' ');

        pdfDocs.push({
          id: file,
          filename: file,
          originalName: file.replace(/^\d+[-_]/, ''),
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          content: extraction.text,
          path: filePath,
          isSample: false,
          canDelete: true,
          fileType: 'pdf',
          numPages: extraction.numPages,
          uploadDate: stats.mtime.toLocaleDateString(),
          fileSize: stats.size,
          status: extraction.statusMessage
        });
      } catch (err) {
        console.warn(`[DocumentLoader] Could not pre-load PDF ${file}: ${err.message}`);
      }
    }

    if (pdfDocs.length > 0) {
      console.log(`[DocumentLoader] Loaded ${pdfDocs.length} previously uploaded PDFs from ${uploadsDir}.`);
    }

    return pdfDocs;
  }
}

module.exports = DocumentLoader;

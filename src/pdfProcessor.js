const fs = require('fs');
const pdfParse = require('pdf-parse');

class PdfProcessor {
  /**
   * Validates whether a file has a valid PDF magic number (%PDF-).
   * @param {string} filePath - Absolute path to PDF file
   * @returns {boolean}
   */
  isValidPdfSignature(filePath) {
    try {
      const buffer = Buffer.alloc(5);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 5, 0);
      fs.closeSync(fd);
      return buffer.toString('ascii') === '%PDF-';
    } catch (err) {
      console.error(`[PdfProcessor] Error reading file signature: ${err.message}`);
      return false;
    }
  }

  /**
   * Extracts text, page count, and metadata from a PDF file.
   * Handles multi-page PDFs, empty PDFs, and scanned (image-only) PDFs gracefully.
   * @param {string} filePath - Absolute path to the PDF file
   * @returns {Promise<{
   *   text: string,
   *   numPages: number,
   *   info: object,
   *   isScannedOrEmpty: boolean,
   *   statusMessage: string
   * }>}
   */
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }

    // Verify magic bytes signature
    if (!this.isValidPdfSignature(filePath)) {
      throw new Error('Invalid PDF file signature. File is corrupted or not a real PDF document.');
    }

    const dataBuffer = fs.readFileSync(filePath);

    try {
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text || '';
      // Preserve meaningful text while cleaning up extraneous control characters
      const cleanText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, ' ')
        .trim();

      const wordCount = cleanText.length > 0 ? cleanText.split(/\s+/).filter(Boolean).length : 0;
      const isScannedOrEmpty = wordCount < 5;

      let statusMessage = 'Indexed successfully';
      if (isScannedOrEmpty) {
        statusMessage = pdfData.numpages > 0
          ? 'Warning: Minimal or no extractable text found. This document may be an image-only / scanned PDF. Optical Character Recognition (OCR) is required to index image-based PDFs.'
          : 'Warning: Empty document.';
      }

      return {
        text: cleanText,
        numPages: pdfData.numpages || 1,
        info: pdfData.info || {},
        isScannedOrEmpty: isScannedOrEmpty,
        wordCount: wordCount,
        statusMessage: statusMessage
      };
    } catch (parseError) {
      console.error(`[PdfProcessor] Failed to parse PDF ${filePath}:`, parseError.message);
      throw new Error(`Failed to extract text from PDF: ${parseError.message}`);
    }
  }
}

module.exports = PdfProcessor;

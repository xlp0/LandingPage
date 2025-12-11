export class BinarySignatureDetector {
    contentTypeName = "binary";
    // Signatures map: [Signature Bytes, Mime Type]
    static SIGNATURES = [
        [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), 'image/png'],
        [new Uint8Array([0xFF, 0xD8, 0xFF]), 'image/jpeg'],
        [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), 'image/gif'], // GIF87a
        [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), 'image/gif'], // GIF89a
        [new Uint8Array([0x42, 0x4D]), 'image/bmp'], // BM
        [new Uint8Array([0x00, 0x00, 0x01, 0x00]), 'image/x-icon'],
        [new Uint8Array([0x00, 0x00, 0x02, 0x00]), 'image/x-icon'],
        [new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'application/pdf'], // %PDF
        [new Uint8Array([0x50, 0x4B, 0x03, 0x04]), 'application/zip'], // PK..
        [new Uint8Array([0x1F, 0x8B, 0x08]), 'application/gzip'],
        [new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]), 'application/x-rar-compressed'],
        [new Uint8Array([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]), 'application/x-7z-compressed'],
        [new Uint8Array([0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00]), 'application/x-sqlite3'],
    ];
    detect(contentSample, lines, firstLine, fileExtension) {
        const mime = this.getMimeType(contentSample, lines, firstLine, fileExtension);
        return (mime && mime !== 'application/octet-stream') ? 0.95 : 0.0;
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        const bytes = this.toBytes(contentSample);
        // RIFF check
        if (this.startsWith(bytes, new Uint8Array([0x52, 0x49, 0x46, 0x46]))) { // RIFF
            return this.detectRiffFormat(bytes);
        }
        for (const [sig, mime] of BinarySignatureDetector.SIGNATURES) {
            if (this.startsWith(bytes, sig)) {
                if (mime === 'application/zip') {
                    return this.detectZipType(bytes);
                }
                return mime;
            }
        }
        // Return generic binary if no specific signature but looks binary? 
        // Not implemented here, returning default null/octet-stream from interface logic
        return 'application/octet-stream';
    }
    toBytes(content) {
        if (content instanceof Uint8Array)
            return content;
        return new TextEncoder().encode(content);
    }
    startsWith(data, prefix) {
        if (data.length < prefix.length)
            return false;
        for (let i = 0; i < prefix.length; i++) {
            if (data[i] !== prefix[i])
                return false;
        }
        return true;
    }
    detectRiffFormat(bytes) {
        if (bytes.length < 12)
            return 'application/octet-stream';
        // Offset 8: 4 bytes
        const format = new TextDecoder().decode(bytes.slice(8, 12));
        if (format === 'WAVE')
            return 'audio/wav';
        if (format === 'WEBP')
            return 'image/webp';
        return 'application/octet-stream';
    }
    detectZipType(bytes) {
        // Basic contains check for office signatures
        // Converting first 2KB to string (ignoring errors) to search
        // Note: TextDecoder replacement char is .
        const header = new TextDecoder().decode(bytes.slice(0, 2048));
        if (header.includes('[Content_Types].xml') && header.includes('_rels/.rels')) {
            if (header.includes('word/'))
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            if (header.includes('xl/'))
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (header.includes('ppt/'))
                return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        }
        return 'application/zip';
    }
}
//# sourceMappingURL=BinaryDetector.js.map
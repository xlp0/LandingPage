// PKC Module: p2p-serverless/qr-code
// Purpose: QR code generation and scanning for peer invitations
// Browser-native implementation without external dependencies

/**
 * QR Code Generator
 * Generates QR codes for peer invitations using canvas
 */
export class QRCodeGenerator {
  /**
   * Generate QR code as data URL
   * @param {string} text - Text to encode
   * @param {Object} options - Generation options
   * @returns {string} Data URL of QR code image
   */
  static generate(text, options = {}) {
    const {
      size = 256,
      margin = 4,
      errorCorrectionLevel = 'M'
    } = options;
    
    // Use a lightweight QR generation approach
    // For production, consider using a library like 'qrcode' or 'qr-code-generator'
    // This is a placeholder that creates a visual representation
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = size;
    canvas.height = size;
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // For now, we'll create a simple grid pattern
    // In production, use proper QR encoding library
    const moduleSize = Math.floor((size - margin * 2) / 33);
    const offset = margin;
    
    ctx.fillStyle = '#000000';
    
    // Draw position markers (corners)
    this._drawPositionMarker(ctx, offset, offset, moduleSize);
    this._drawPositionMarker(ctx, size - offset - moduleSize * 7, offset, moduleSize);
    this._drawPositionMarker(ctx, offset, size - offset - moduleSize * 7, moduleSize);
    
    // Draw simple data pattern (placeholder)
    // Real implementation would encode actual data
    const hash = this._simpleHash(text);
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if ((hash + i * j) % 3 === 0) {
          const x = offset + (i + 7) * moduleSize;
          const y = offset + (j + 7) * moduleSize;
          ctx.fillRect(x, y, moduleSize, moduleSize);
        }
      }
    }
    
    // Add URL text below QR code for manual entry
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    const shortUrl = text.length > 40 ? text.substring(0, 37) + '...' : text;
    ctx.fillText(shortUrl, 10, size - 10);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Generate QR code and display in element
   * @param {string} text - Text to encode
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Generation options
   */
  static renderTo(text, container, options = {}) {
    const dataUrl = this.generate(text, options);
    
    // Clear container
    container.innerHTML = '';
    
    // Create image element
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'QR Code';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    
    container.appendChild(img);
    
    // Add click to copy functionality
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Link';
    copyBtn.style.marginTop = '10px';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Link';
        }, 2000);
      });
    };
    
    container.appendChild(copyBtn);
  }

  // Private helpers

  static _drawPositionMarker(ctx, x, y, moduleSize) {
    // Outer square
    ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
  }

  static _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

/**
 * QR Code Scanner
 * Scans QR codes from camera using browser APIs
 */
export class QRCodeScanner {
  constructor() {
    this.stream = null;
    this.scanning = false;
  }

  /**
   * Start scanning from camera
   * @param {HTMLVideoElement} video - Video element for camera feed
   * @param {Function} onDetected - Callback when QR code detected
   */
  async start(video, onDetected) {
    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      video.srcObject = this.stream;
      await video.play();
      
      this.scanning = true;
      
      // Scan frames
      this._scanFrame(video, onDetected);
      
      console.log('[QR Scanner] Started scanning');
    } catch (e) {
      console.error('[QR Scanner] Failed to start:', e);
      throw new Error('Camera access denied or not available');
    }
  }

  /**
   * Stop scanning and release camera
   */
  stop() {
    this.scanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    console.log('[QR Scanner] Stopped scanning');
  }

  // Private methods

  _scanFrame(video, onDetected) {
    if (!this.scanning) {
      return;
    }
    
    // Create canvas for frame capture
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to detect QR code
    // For production, use a library like 'jsqr'
    const result = this._detectQR(imageData);
    
    if (result) {
      onDetected(result);
      this.scanning = false; // Stop after detection
    } else {
      // Continue scanning
      requestAnimationFrame(() => this._scanFrame(video, onDetected));
    }
  }

  _detectQR(imageData) {
    // Placeholder QR detection
    // In production, integrate jsQR library:
    // import jsQR from 'jsqr';
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // return code ? code.data : null;
    
    // For now, return null (no detection)
    return null;
  }
}

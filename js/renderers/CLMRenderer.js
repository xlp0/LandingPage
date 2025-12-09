/**
 * CLM (Cubical Logic Model) Renderer
 * Renders CLM YAML files with three-dimensional structure visualization
 */

export class CLMRenderer {
  constructor() {
    this.name = 'CLM Renderer';
    this.contentType = 'clm';
  }

  /**
   * Check if this renderer can handle the content
   */
  canRender(content, options = {}) {
    if (typeof content !== 'string') return false;
    
    // Check for CLM structure
    return content.includes('specification:') && 
           content.includes('implementation:') && 
           (content.includes('verification:') || content.includes('balanced:'));
  }

  /**
   * Parse YAML-like content into structured data
   */
  parseYAML(content) {
    try {
      const lines = content.split('\n');
      const result = {
        specification: {},
        implementation: {},
        verification: {},
        metadata: {}
      };
      
      let currentSection = null;
      let currentSubsection = null;
      let indentLevel = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') continue;
        
        // Detect main sections
        if (trimmed.startsWith('specification:')) {
          currentSection = 'specification';
          continue;
        } else if (trimmed.startsWith('implementation:')) {
          currentSection = 'implementation';
          continue;
        } else if (trimmed.startsWith('verification:')) {
          currentSection = 'verification';
          continue;
        } else if (trimmed.startsWith('metadata:')) {
          currentSection = 'metadata';
          continue;
        }
        
        // Parse key-value pairs
        if (trimmed.includes(':') && currentSection) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (!result[currentSection][key]) {
            result[currentSection][key] = value || {};
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('[CLM] Error parsing YAML:', error);
      return null;
    }
  }

  /**
   * Render CLM content as HTML
   */
  async render(content, options = {}) {
    const parsed = this.parseYAML(content);
    
    if (!parsed) {
      return `<div class="clm-error">Failed to parse CLM content</div>`;
    }

    const html = `
      <div class="clm-container">
        <div class="clm-header">
          <h2 class="clm-title">
            <i data-lucide="box" style="width: 20px; height: 20px;"></i>
            Cubical Logic Model
          </h2>
          <p class="clm-subtitle">Three-Dimensional Verifiable Computation</p>
        </div>

        <div class="clm-dimensions">
          <!-- Specification Dimension -->
          <div class="clm-dimension clm-specification">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Specification</h3>
              <span class="clm-dimension-label">Abstract</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.specification, 'specification')}
            </div>
          </div>

          <!-- Implementation Dimension -->
          <div class="clm-dimension clm-implementation">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="code" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Implementation</h3>
              <span class="clm-dimension-label">Concrete</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.implementation, 'implementation')}
            </div>
          </div>

          <!-- Verification Dimension -->
          <div class="clm-dimension clm-verification">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Verification</h3>
              <span class="clm-dimension-label">Balanced</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.verification, 'verification')}
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        ${Object.keys(parsed.metadata).length > 0 ? `
          <div class="clm-metadata">
            <h4>Metadata</h4>
            ${this.renderSection(parsed.metadata, 'metadata')}
          </div>
        ` : ''}

        <!-- Raw YAML Toggle -->
        <div class="clm-raw-toggle">
          <button onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent.includes('Show') ? 'Hide Raw YAML' : 'Show Raw YAML';" class="clm-toggle-btn">
            Show Raw YAML
          </button>
          <pre class="clm-raw-yaml" style="display: none;"><code>${this.escapeHtml(content)}</code></pre>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render a section of the CLM
   */
  renderSection(section, sectionType) {
    if (!section || typeof section !== 'object') {
      return '<p class="clm-empty">No data</p>';
    }

    let html = '<div class="clm-properties">';
    
    for (const [key, value] of Object.entries(section)) {
      if (typeof value === 'string' && value) {
        html += `
          <div class="clm-property">
            <span class="clm-property-key">${this.escapeHtml(key)}:</span>
            <span class="clm-property-value">${this.escapeHtml(value)}</span>
          </div>
        `;
      } else if (typeof value === 'object' && value !== null) {
        html += `
          <div class="clm-property">
            <span class="clm-property-key">${this.escapeHtml(key)}:</span>
            <div class="clm-nested">${this.renderSection(value, sectionType)}</div>
          </div>
        `;
      }
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-register if RendererRegistry is available
if (typeof window !== 'undefined' && window.rendererRegistry) {
  window.rendererRegistry.register('clm', new CLMRenderer());
  console.log('[CLM] CLM Renderer registered');
}

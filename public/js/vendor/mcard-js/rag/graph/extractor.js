/**
 * Graph Extractor
 *
 * Extracts entities and relationships from MCard content using LLM.
 *
 * Mirrors Python: mcard/rag/graph/extractor.py
 */
// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Create an Entity object
 */
export function createEntity(name, type = 'OTHER', description = '') {
    return { name, type, description };
}
/**
 * Create a Relationship object
 */
export function createRelationship(source, target, relationship, description = '', weight = 1.0) {
    return { source, target, relationship, description, weight };
}
/**
 * Create an ExtractionResult object
 */
export function createExtractionResult(entities = [], relationships = [], success = true, error) {
    return { entities, relationships, success, error };
}
// ─────────────────────────────────────────────────────────────────────────────
// Extraction Prompts
// ─────────────────────────────────────────────────────────────────────────────
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured information from text.
Given a text, identify:
1. ENTITIES: Named concepts, technologies, people, organizations, or things
2. RELATIONSHIPS: How entities relate to each other

Respond ONLY with valid JSON in this format:
{
  "entities": [
    {"name": "EntityName", "type": "CONCEPT|TECHNOLOGY|PERSON|ORGANIZATION|OTHER", "description": "Brief description"}
  ],
  "relationships": [
    {"source": "Entity1", "target": "Entity2", "relationship": "verb phrase", "description": "Optional context"}
  ]
}

Entity types:
- CONCEPT: Abstract ideas, methodologies, patterns (e.g., "content-addressable storage")
- TECHNOLOGY: Systems, libraries, frameworks (e.g., "SQLite", "Python")  
- PERSON: People names
- ORGANIZATION: Companies, groups
- OTHER: Anything else

Keep entity names concise but unique. Use present tense for relationships.`;
export const EXTRACTION_USER_PROMPT = `Extract entities and relationships from this text:

---
{content}
---

Remember: Return ONLY valid JSON.`;
const DEFAULT_EXTRACTOR_CONFIG = {
    model: 'gemma3:latest',
    temperature: 0.1,
    maxRetries: 2,
    ollamaBaseUrl: 'http://localhost:11434',
};
/**
 * Extracts entities and relationships from text using LLM.
 *
 * Usage:
 *     const extractor = new GraphExtractor({ model: 'gemma3:latest' });
 *     const result = await extractor.extract("MCard is a TypeScript library...");
 *
 *     for (const entity of result.entities) {
 *         console.log(`${entity.name} (${entity.type})`);
 *     }
 *
 *     for (const rel of result.relationships) {
 *         console.log(`${rel.source} --${rel.relationship}--> ${rel.target}`);
 *     }
 */
export class GraphExtractor {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_EXTRACTOR_CONFIG, ...config };
    }
    /**
     * Extract entities and relationships from content.
     *
     * @param content - Text to extract from
     * @returns ExtractionResult with entities and relationships
     */
    async extract(content) {
        if (!content || !content.trim()) {
            return createExtractionResult([], [], false, 'Empty content');
        }
        // Truncate if too long
        const maxChars = 6000;
        if (content.length > maxChars) {
            content = content.slice(0, maxChars) + '\n[...truncated...]';
        }
        // Call LLM for extraction with retries
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const result = await this.callLLM(content);
                const parsed = this.parseResponse(result);
                if (parsed.entities.length > 0 || parsed.relationships.length > 0) {
                    return parsed;
                }
            }
            catch (error) {
                console.warn(`Extraction attempt ${attempt + 1} failed: ${error}`);
                if (attempt === this.config.maxRetries) {
                    return createExtractionResult([], [], false, String(error));
                }
            }
        }
        return createExtractionResult([], [], false, 'No entities extracted');
    }
    /**
     * Call LLM for extraction
     */
    async callLLM(content) {
        const prompt = EXTRACTION_USER_PROMPT.replace('{content}', content);
        const url = `${this.config.ollamaBaseUrl}/api/generate`;
        const payload = {
            model: this.config.model,
            prompt: `${EXTRACTION_SYSTEM_PROMPT}\n\n${prompt}`,
            stream: false,
            options: {
                temperature: this.config.temperature,
            }
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`LLM call failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return result.response || '';
    }
    /**
     * Parse LLM response into structured data
     */
    parseResponse(response) {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }
        let jsonStr = jsonMatch[0];
        let data;
        try {
            data = JSON.parse(jsonStr);
        }
        catch {
            // Try to fix common issues
            jsonStr = this.cleanJson(jsonStr);
            data = JSON.parse(jsonStr);
        }
        const entities = [];
        for (const e of (data.entities || [])) {
            if (typeof e === 'object' && e.name) {
                entities.push({
                    name: String(e.name).trim(),
                    type: String(e.type || 'OTHER').toUpperCase(),
                    description: String(e.description || '').trim(),
                });
            }
        }
        const relationships = [];
        for (const r of (data.relationships || [])) {
            if (typeof r === 'object' && r.source && r.target) {
                relationships.push({
                    source: String(r.source).trim(),
                    target: String(r.target).trim(),
                    relationship: String(r.relationship || 'relates_to').trim(),
                    description: String(r.description || '').trim(),
                    weight: 1.0,
                });
            }
        }
        return createExtractionResult(entities, relationships, true);
    }
    /**
     * Try to clean up malformed JSON
     */
    cleanJson(jsonStr) {
        // Remove trailing commas
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        // Remove control characters
        jsonStr = jsonStr.replace(/[\x00-\x1f]/g, '');
        return jsonStr;
    }
    /**
     * Extract from multiple texts
     */
    async extractBatch(contents) {
        const results = [];
        for (const content of contents) {
            results.push(await this.extract(content));
        }
        return results;
    }
}
//# sourceMappingURL=extractor.js.map
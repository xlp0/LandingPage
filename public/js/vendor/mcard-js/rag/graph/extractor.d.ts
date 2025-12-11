/**
 * Graph Extractor
 *
 * Extracts entities and relationships from MCard content using LLM.
 *
 * Mirrors Python: mcard/rag/graph/extractor.py
 */
/**
 * Represents an entity extracted from text.
 */
export interface Entity {
    name: string;
    type: EntityType;
    description: string;
    id?: number;
}
export type EntityType = 'CONCEPT' | 'TECHNOLOGY' | 'PERSON' | 'ORGANIZATION' | 'OTHER';
/**
 * Represents a relationship between two entities.
 */
export interface Relationship {
    source: string;
    target: string;
    relationship: string;
    description: string;
    weight: number;
}
/**
 * Result from entity/relationship extraction.
 */
export interface ExtractionResult {
    entities: Entity[];
    relationships: Relationship[];
    success: boolean;
    error?: string;
}
/**
 * Create an Entity object
 */
export declare function createEntity(name: string, type?: EntityType, description?: string): Entity;
/**
 * Create a Relationship object
 */
export declare function createRelationship(source: string, target: string, relationship: string, description?: string, weight?: number): Relationship;
/**
 * Create an ExtractionResult object
 */
export declare function createExtractionResult(entities?: Entity[], relationships?: Relationship[], success?: boolean, error?: string): ExtractionResult;
export declare const EXTRACTION_SYSTEM_PROMPT = "You are an expert at extracting structured information from text.\nGiven a text, identify:\n1. ENTITIES: Named concepts, technologies, people, organizations, or things\n2. RELATIONSHIPS: How entities relate to each other\n\nRespond ONLY with valid JSON in this format:\n{\n  \"entities\": [\n    {\"name\": \"EntityName\", \"type\": \"CONCEPT|TECHNOLOGY|PERSON|ORGANIZATION|OTHER\", \"description\": \"Brief description\"}\n  ],\n  \"relationships\": [\n    {\"source\": \"Entity1\", \"target\": \"Entity2\", \"relationship\": \"verb phrase\", \"description\": \"Optional context\"}\n  ]\n}\n\nEntity types:\n- CONCEPT: Abstract ideas, methodologies, patterns (e.g., \"content-addressable storage\")\n- TECHNOLOGY: Systems, libraries, frameworks (e.g., \"SQLite\", \"Python\")  \n- PERSON: People names\n- ORGANIZATION: Companies, groups\n- OTHER: Anything else\n\nKeep entity names concise but unique. Use present tense for relationships.";
export declare const EXTRACTION_USER_PROMPT = "Extract entities and relationships from this text:\n\n---\n{content}\n---\n\nRemember: Return ONLY valid JSON.";
export interface GraphExtractorConfig {
    model: string;
    temperature: number;
    maxRetries: number;
    ollamaBaseUrl: string;
}
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
export declare class GraphExtractor {
    private config;
    constructor(config?: Partial<GraphExtractorConfig>);
    /**
     * Extract entities and relationships from content.
     *
     * @param content - Text to extract from
     * @returns ExtractionResult with entities and relationships
     */
    extract(content: string): Promise<ExtractionResult>;
    /**
     * Call LLM for extraction
     */
    private callLLM;
    /**
     * Parse LLM response into structured data
     */
    private parseResponse;
    /**
     * Try to clean up malformed JSON
     */
    private cleanJson;
    /**
     * Extract from multiple texts
     */
    extractBatch(contents: string[]): Promise<ExtractionResult[]>;
}
//# sourceMappingURL=extractor.d.ts.map
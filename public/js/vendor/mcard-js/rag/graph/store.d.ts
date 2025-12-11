/**
 * Graph Store
 *
 * SQLite-based knowledge graph storage with traversal capabilities.
 *
 * Mirrors Python: mcard/rag/graph/store.py
 */
import { Entity, ExtractionResult } from './extractor';
export interface EntityRecord {
    id: number;
    name: string;
    type: string;
    description: string;
    sourceHash: string;
    createdAt?: string;
}
export interface RelationshipRecord {
    relId: number;
    relationship: string;
    description: string;
    weight: number;
    targetId?: number;
    targetName?: string;
    targetType?: string;
    sourceId?: number;
    sourceName?: string;
    sourceType?: string;
}
export interface CommunityRecord {
    id: number;
    title: string;
    summary: string;
    memberIds: number[];
    level: number;
}
export interface GraphStats {
    entityCount: number;
    relationshipCount: number;
    extractionCount: number;
    entityTypes: Record<string, number>;
}
export interface RelatedEntity {
    entity: EntityRecord;
    depth: number;
    path: string[];
    relationship: string;
}
/**
 * SQLite-based storage for knowledge graph.
 *
 * Features:
 * - Entity and relationship storage
 * - Graph traversal (BFS)
 * - Multi-hop pathfinding
 * - Community management
 *
 * Usage:
 *     const store = new GraphStore('graph.db');
 *
 *     // Add entities
 *     const entityId = store.addEntity(entity, sourceHash);
 *
 *     // Add relationships
 *     store.addRelationship(sourceId, targetId, 'relates_to', sourceHash);
 *
 *     // Find related entities
 *     const related = store.findRelated('MCard', 2);
 */
export declare class GraphStore {
    private db;
    readonly dbPath: string;
    constructor(dbPath?: string);
    private initDatabase;
    /**
     * Add an entity to the graph.
     *
     * @param entity - Entity to add
     * @param sourceHash - Source MCard hash
     * @param embedding - Optional entity embedding
     * @returns Entity ID
     */
    addEntity(entity: Entity, sourceHash: string, embedding?: Uint8Array): number;
    /**
     * Get entity by name (case-insensitive)
     */
    getEntityByName(name: string): EntityRecord | null;
    /**
     * Get entity by ID
     */
    getEntityById(entityId: number): EntityRecord | null;
    /**
     * Search entities by name pattern
     */
    searchEntities(query: string, typeFilter?: string, limit?: number): EntityRecord[];
    /**
     * Get all entities from a source MCard
     */
    getEntitiesBySource(sourceHash: string): EntityRecord[];
    /**
     * Add a relationship between entities.
     *
     * @param sourceEntityId - Source entity ID
     * @param targetEntityId - Target entity ID
     * @param relationship - Relationship type/verb
     * @param sourceHash - Source MCard hash
     * @param description - Optional description
     * @param weight - Relationship weight
     * @returns Relationship ID
     */
    addRelationship(sourceEntityId: number, targetEntityId: number, relationship: string, sourceHash: string, description?: string, weight?: number): number;
    /**
     * Get outgoing relationships from an entity
     */
    getRelationshipsFrom(entityId: number): RelationshipRecord[];
    /**
     * Get incoming relationships to an entity
     */
    getRelationshipsTo(entityId: number): RelationshipRecord[];
    /**
     * Add a community summary
     */
    addCommunity(title: string, summary: string, memberIds: number[], level?: number, parentId?: number, embedding?: Uint8Array): number;
    /**
     * Get communities by level
     */
    getCommunities(level?: number): CommunityRecord[];
    /**
     * Find entities within N hops of a given entity.
     *
     * @param entityName - Starting entity name
     * @param hops - Maximum traversal depth
     * @param direction - 'outgoing', 'incoming', or 'both'
     * @returns List of related entities with their paths
     */
    findRelated(entityName: string, hops?: number, direction?: 'outgoing' | 'incoming' | 'both'): RelatedEntity[];
    /**
     * Find shortest path between two entities.
     *
     * @param sourceName - Starting entity name
     * @param targetName - Target entity name
     * @param maxDepth - Maximum path length
     * @returns List of entity names in path, or null if no path
     */
    findPath(sourceName: string, targetName: string, maxDepth?: number): string[] | null;
    /**
     * Mark a source as having been extracted
     */
    markExtracted(sourceHash: string, entityCount: number, relCount: number): void;
    /**
     * Check if a source has been extracted
     */
    isExtracted(sourceHash: string): boolean;
    countEntities(): number;
    countRelationships(): number;
    countExtractions(): number;
    getEntityTypes(): Record<string, number>;
    getStats(): GraphStats;
    /**
     * Clear all graph data
     */
    clear(): void;
    /**
     * Close the database connection
     */
    close(): void;
}
/**
 * Store an extraction result in the graph.
 *
 * @param store - GraphStore instance
 * @param result - ExtractionResult from GraphExtractor
 * @param sourceHash - Source MCard hash
 * @returns Tuple of [entityCount, relationshipCount] stored
 */
export declare function storeExtractionResult(store: GraphStore, result: ExtractionResult, sourceHash: string): [number, number];
//# sourceMappingURL=store.d.ts.map
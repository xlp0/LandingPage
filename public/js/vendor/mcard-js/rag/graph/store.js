/**
 * Graph Store
 *
 * SQLite-based knowledge graph storage with traversal capabilities.
 *
 * Mirrors Python: mcard/rag/graph/store.py
 */
import Database from 'better-sqlite3';
import { initGraphSchemas } from '../../storage/schema';
// ─────────────────────────────────────────────────────────────────────────────
// GraphStore Class
// ─────────────────────────────────────────────────────────────────────────────
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
export class GraphStore {
    db;
    dbPath;
    constructor(dbPath = ':memory:') {
        this.dbPath = dbPath;
        this.db = this.initDatabase();
    }
    initDatabase() {
        const db = new Database(this.dbPath);
        // Create all graph tables using SSoT schema
        initGraphSchemas(db);
        console.debug(`Initialized graph store at ${this.dbPath}`);
        return db;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Entity Operations
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Add an entity to the graph.
     *
     * @param entity - Entity to add
     * @param sourceHash - Source MCard hash
     * @param embedding - Optional entity embedding
     * @returns Entity ID
     */
    addEntity(entity, sourceHash, embedding) {
        const now = new Date().toISOString();
        try {
            const stmt = this.db.prepare(`
                INSERT INTO graph_entities (name, type, description, source_hash, embedding, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(entity.name, entity.type, entity.description, sourceHash, embedding || null, now);
            return result.lastInsertRowid;
        }
        catch (error) {
            // Entity already exists, get its ID
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE')) {
                const stmt = this.db.prepare(`
                    SELECT id FROM graph_entities 
                    WHERE name = ? AND type = ? AND source_hash = ?
                `);
                const row = stmt.get(entity.name, entity.type, sourceHash);
                return row?.id ?? -1;
            }
            throw error;
        }
    }
    /**
     * Get entity by name (case-insensitive)
     */
    getEntityByName(name) {
        const stmt = this.db.prepare(`
            SELECT id, name, type, description, source_hash, created_at
            FROM graph_entities
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        `);
        const row = stmt.get(name);
        if (row) {
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                description: row.description,
                sourceHash: row.source_hash,
                createdAt: row.created_at,
            };
        }
        return null;
    }
    /**
     * Get entity by ID
     */
    getEntityById(entityId) {
        const stmt = this.db.prepare(`
            SELECT id, name, type, description, source_hash, created_at
            FROM graph_entities
            WHERE id = ?
        `);
        const row = stmt.get(entityId);
        if (row) {
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                description: row.description,
                sourceHash: row.source_hash,
                createdAt: row.created_at,
            };
        }
        return null;
    }
    /**
     * Search entities by name pattern
     */
    searchEntities(query, typeFilter, limit = 10) {
        let stmt;
        let rows;
        if (typeFilter) {
            stmt = this.db.prepare(`
                SELECT id, name, type, description, source_hash
                FROM graph_entities
                WHERE name LIKE ? AND type = ?
                LIMIT ?
            `);
            rows = stmt.all(`%${query}%`, typeFilter, limit);
        }
        else {
            stmt = this.db.prepare(`
                SELECT id, name, type, description, source_hash
                FROM graph_entities
                WHERE name LIKE ?
                LIMIT ?
            `);
            rows = stmt.all(`%${query}%`, limit);
        }
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            description: r.description,
            sourceHash: r.source_hash,
        }));
    }
    /**
     * Get all entities from a source MCard
     */
    getEntitiesBySource(sourceHash) {
        const stmt = this.db.prepare(`
            SELECT id, name, type, description
            FROM graph_entities
            WHERE source_hash = ?
        `);
        const rows = stmt.all(sourceHash);
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            description: r.description,
            sourceHash: sourceHash,
        }));
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Relationship Operations
    // ─────────────────────────────────────────────────────────────────────────
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
    addRelationship(sourceEntityId, targetEntityId, relationship, sourceHash, description = '', weight = 1.0) {
        const now = new Date().toISOString();
        try {
            const stmt = this.db.prepare(`
                INSERT INTO graph_relationships 
                (source_entity_id, target_entity_id, relationship, description, weight, source_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(sourceEntityId, targetEntityId, relationship, description, weight, sourceHash, now);
            return result.lastInsertRowid;
        }
        catch (error) {
            // Relationship already exists
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE')) {
                return -1;
            }
            throw error;
        }
    }
    /**
     * Get outgoing relationships from an entity
     */
    getRelationshipsFrom(entityId) {
        const stmt = this.db.prepare(`
            SELECT r.id, r.relationship, r.description, r.weight,
                   e.id as target_id, e.name as target_name, e.type as target_type
            FROM graph_relationships r
            JOIN graph_entities e ON r.target_entity_id = e.id
            WHERE r.source_entity_id = ?
        `);
        const rows = stmt.all(entityId);
        return rows.map(r => ({
            relId: r.id,
            relationship: r.relationship,
            description: r.description,
            weight: r.weight,
            targetId: r.target_id,
            targetName: r.target_name,
            targetType: r.target_type,
        }));
    }
    /**
     * Get incoming relationships to an entity
     */
    getRelationshipsTo(entityId) {
        const stmt = this.db.prepare(`
            SELECT r.id, r.relationship, r.description, r.weight,
                   e.id as source_id, e.name as source_name, e.type as source_type
            FROM graph_relationships r
            JOIN graph_entities e ON r.source_entity_id = e.id
            WHERE r.target_entity_id = ?
        `);
        const rows = stmt.all(entityId);
        return rows.map(r => ({
            relId: r.id,
            relationship: r.relationship,
            description: r.description,
            weight: r.weight,
            sourceId: r.source_id,
            sourceName: r.source_name,
            sourceType: r.source_type,
        }));
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Community Operations
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Add a community summary
     */
    addCommunity(title, summary, memberIds, level = 0, parentId, embedding) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO graph_communities 
            (title, summary, member_entity_ids, level, parent_community_id, embedding, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(title, summary, JSON.stringify(memberIds), level, parentId ?? null, embedding ?? null, now);
        return result.lastInsertRowid;
    }
    /**
     * Get communities by level
     */
    getCommunities(level = 0) {
        const stmt = this.db.prepare(`
            SELECT id, title, summary, member_entity_ids, level
            FROM graph_communities
            WHERE level = ?
        `);
        const rows = stmt.all(level);
        return rows.map(r => ({
            id: r.id,
            title: r.title,
            summary: r.summary,
            memberIds: r.member_entity_ids ? JSON.parse(r.member_entity_ids) : [],
            level: r.level,
        }));
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Graph Traversal
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Find entities within N hops of a given entity.
     *
     * @param entityName - Starting entity name
     * @param hops - Maximum traversal depth
     * @param direction - 'outgoing', 'incoming', or 'both'
     * @returns List of related entities with their paths
     */
    findRelated(entityName, hops = 2, direction = 'both') {
        // Find starting entity
        const start = this.getEntityByName(entityName);
        if (!start)
            return [];
        const visited = new Set([start.id]);
        const results = [];
        const frontier = [[start.id, 0, [start.name]]];
        while (frontier.length > 0) {
            const [currentId, depth, path] = frontier.shift();
            if (depth >= hops)
                continue;
            // Get adjacent entities
            const neighbors = [];
            if (direction === 'outgoing' || direction === 'both') {
                for (const rel of this.getRelationshipsFrom(currentId)) {
                    neighbors.push([
                        rel.targetId,
                        rel.targetName,
                        rel.relationship,
                        'outgoing'
                    ]);
                }
            }
            if (direction === 'incoming' || direction === 'both') {
                for (const rel of this.getRelationshipsTo(currentId)) {
                    neighbors.push([
                        rel.sourceId,
                        rel.sourceName,
                        rel.relationship,
                        'incoming'
                    ]);
                }
            }
            for (const [neighborId, neighborName, rel, dir] of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const newPath = [...path, `--${rel}->`, neighborName];
                    const entity = this.getEntityById(neighborId);
                    if (entity) {
                        results.push({
                            entity,
                            depth: depth + 1,
                            path: newPath,
                            relationship: rel,
                        });
                    }
                    frontier.push([neighborId, depth + 1, newPath]);
                }
            }
        }
        return results;
    }
    /**
     * Find shortest path between two entities.
     *
     * @param sourceName - Starting entity name
     * @param targetName - Target entity name
     * @param maxDepth - Maximum path length
     * @returns List of entity names in path, or null if no path
     */
    findPath(sourceName, targetName, maxDepth = 4) {
        const source = this.getEntityByName(sourceName);
        const target = this.getEntityByName(targetName);
        if (!source || !target)
            return null;
        if (source.id === target.id)
            return [sourceName];
        // BFS for shortest path
        const visited = new Set([source.id]);
        const queue = [[source.id, [source.name]]];
        while (queue.length > 0) {
            const [currentId, path] = queue.shift();
            if (path.length > maxDepth)
                continue;
            for (const rel of this.getRelationshipsFrom(currentId)) {
                const neighborId = rel.targetId;
                if (neighborId === target.id) {
                    return [...path, `--${rel.relationship}->`, targetName];
                }
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push([
                        neighborId,
                        [...path, `--${rel.relationship}->`, rel.targetName]
                    ]);
                }
            }
        }
        return null;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Extraction Tracking
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Mark a source as having been extracted
     */
    markExtracted(sourceHash, entityCount, relCount) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO graph_extractions 
            (hash, entity_count, relationship_count, extracted_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(sourceHash, entityCount, relCount, now);
    }
    /**
     * Check if a source has been extracted
     */
    isExtracted(sourceHash) {
        const stmt = this.db.prepare('SELECT 1 FROM graph_extractions WHERE hash = ?');
        return stmt.get(sourceHash) !== undefined;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────────────────
    countEntities() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM graph_entities');
        return stmt.get().count;
    }
    countRelationships() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM graph_relationships');
        return stmt.get().count;
    }
    countExtractions() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM graph_extractions');
        return stmt.get().count;
    }
    getEntityTypes() {
        const stmt = this.db.prepare(`
            SELECT type, COUNT(*) as count FROM graph_entities
            GROUP BY type
            ORDER BY COUNT(*) DESC
        `);
        const rows = stmt.all();
        const result = {};
        for (const row of rows) {
            result[row.type] = row.count;
        }
        return result;
    }
    getStats() {
        return {
            entityCount: this.countEntities(),
            relationshipCount: this.countRelationships(),
            extractionCount: this.countExtractions(),
            entityTypes: this.getEntityTypes(),
        };
    }
    /**
     * Clear all graph data
     */
    clear() {
        this.db.exec('DELETE FROM graph_relationships');
        this.db.exec('DELETE FROM graph_entities');
        this.db.exec('DELETE FROM graph_communities');
        this.db.exec('DELETE FROM graph_extractions');
        console.info('Graph store cleared');
    }
    /**
     * Close the database connection
     */
    close() {
        this.db.close();
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Batch Operations
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Store an extraction result in the graph.
 *
 * @param store - GraphStore instance
 * @param result - ExtractionResult from GraphExtractor
 * @param sourceHash - Source MCard hash
 * @returns Tuple of [entityCount, relationshipCount] stored
 */
export function storeExtractionResult(store, result, sourceHash) {
    if (!result.success) {
        return [0, 0];
    }
    const entityMap = {};
    // Add entities
    for (const entity of result.entities) {
        const entityId = store.addEntity(entity, sourceHash);
        if (entityId > 0) {
            entityMap[entity.name.toLowerCase()] = entityId;
        }
    }
    // Add relationships
    let relCount = 0;
    for (const rel of result.relationships) {
        const sourceId = entityMap[rel.source.toLowerCase()];
        const targetId = entityMap[rel.target.toLowerCase()];
        if (sourceId && targetId) {
            const relId = store.addRelationship(sourceId, targetId, rel.relationship, sourceHash, rel.description);
            if (relId > 0) {
                relCount++;
            }
        }
    }
    // Mark as extracted
    store.markExtracted(sourceHash, Object.keys(entityMap).length, relCount);
    return [Object.keys(entityMap).length, relCount];
}
//# sourceMappingURL=store.js.map
/**
 * MCard Database Schema Loader for JavaScript/TypeScript
 *
 * Singleton implementation that loads all schemas from:
 *   schema/mcard_schema.sql (SINGLE SOURCE OF TRUTH)
 *
 * This ensures schema consistency between Python and JavaScript runtimes.
 *
 * Usage:
 *   import { MCardSchema } from './schema';
 *
 *   const schema = MCardSchema.getInstance();
 *   const cardSchema = schema.getTable('card');
 *   schema.initAllTables(db);
 *
 * Architecture Layers:
 *   Layer 1: Core Content Storage (card)
 *   Layer 2: Handle System (handle_registry, handle_history)
 *   Layer 3: Vector Storage (mcard_vector_metadata, mcard_embeddings)
 *   Layer 4: Semantic Versioning (handle_version_vectors, similarity_cache)
 *   Layer 5: Knowledge Graph (entities, relationships, communities)
 *
 * See: docs/architecture/Handle_Vector_Similarity_Design.md
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// ESM compatibility: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ─────────────────────────────────────────────────────────────────────────────
// Schema File Location
// ─────────────────────────────────────────────────────────────────────────────
function findSchemaPath() {
    const pathsToTry = [
        join(__dirname, '..', '..', '..', 'schema', 'mcard_schema.sql'),
        join(__dirname, '..', '..', 'schema', 'mcard_schema.sql'),
        join(process.cwd(), 'schema', 'mcard_schema.sql'),
    ];
    for (const path of pathsToTry) {
        const resolved = resolve(path);
        if (existsSync(resolved)) {
            return resolved;
        }
    }
    throw new Error(`Could not find schema/mcard_schema.sql. Tried: ${pathsToTry.join(', ')}`);
}
function findVectorSchemaPath() {
    const pathsToTry = [
        join(__dirname, '..', '..', '..', 'schema', 'mcard_vector_schema.sql'),
        join(__dirname, '..', '..', 'schema', 'mcard_vector_schema.sql'),
        join(process.cwd(), 'schema', 'mcard_vector_schema.sql'),
    ];
    for (const path of pathsToTry) {
        const resolved = resolve(path);
        if (existsSync(resolved)) {
            return resolved;
        }
    }
    return null;
}
const TABLE_LAYERS = {
    // Layer 1: Core
    'card': 'core',
    // Layer 2: Handle System
    'handle_registry': 'handle',
    'handle_history': 'handle',
    // Layer 3: Vector Storage
    'mcard_vector_metadata': 'vector',
    'mcard_embeddings': 'vector',
    'mcard_fts': 'vector',
    // Layer 4: Semantic Versioning
    'handle_version_vectors': 'semantic',
    'version_similarity_cache': 'semantic',
    // Layer 5: Knowledge Graph
    'graph_entities': 'graph',
    'graph_relationships': 'graph',
    'graph_communities': 'graph',
    'graph_extractions': 'graph',
    // Metadata
    'schema_version': 'metadata',
};
// ─────────────────────────────────────────────────────────────────────────────
// Singleton Schema Manager
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Singleton class for MCard database schema management.
 *
 * Ensures all schema definitions come from the single source of truth:
 * schema/mcard_schema.sql
 */
export class MCardSchema {
    static instance = null;
    schemaPath = '';
    rawSql = '';
    statements = [];
    tables = new Map();
    indexes = new Map();
    loaded = false;
    constructor() { }
    /**
     * Get the singleton instance.
     */
    static getInstance() {
        if (!MCardSchema.instance) {
            MCardSchema.instance = new MCardSchema();
            MCardSchema.instance.load();
        }
        return MCardSchema.instance;
    }
    /**
     * Reset the singleton (for testing).
     */
    static resetInstance() {
        MCardSchema.instance = null;
    }
    load() {
        if (this.loaded)
            return;
        this.schemaPath = findSchemaPath();
        this.rawSql = readFileSync(this.schemaPath, 'utf-8');
        // Load vector schema if available
        const vectorSchemaPath = findVectorSchemaPath();
        if (vectorSchemaPath) {
            const vectorSql = readFileSync(vectorSchemaPath, 'utf-8');
            this.rawSql += "\n\n" + vectorSql;
        }
        this.statements = this.parseStatements(this.rawSql);
        for (const stmt of this.statements) {
            const name = this.extractName(stmt);
            if (name) {
                const upper = stmt.toUpperCase();
                if (upper.includes('CREATE TABLE') || upper.includes('CREATE VIRTUAL TABLE')) {
                    this.tables.set(name.toLowerCase(), stmt);
                }
                else if (upper.includes('CREATE INDEX')) {
                    this.indexes.set(name.toLowerCase(), stmt);
                }
            }
        }
        this.loaded = true;
    }
    parseStatements(sql) {
        // Remove block comments
        sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
        const statements = [];
        let current = [];
        for (const line of sql.split('\n')) {
            // Skip line comments
            const stripped = line.split('--')[0].trim();
            if (!stripped)
                continue;
            current.push(stripped);
            if (stripped.endsWith(';')) {
                const statement = current.join(' ');
                // Skip INSERT statements
                if (!statement.trim().toUpperCase().startsWith('INSERT')) {
                    statements.push(statement);
                }
                current = [];
            }
        }
        return statements.filter(s => s.trim());
    }
    extractName(statement) {
        // Handle CREATE TABLE
        let match = statement.match(/CREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (match)
            return match[1];
        // Handle CREATE INDEX
        match = statement.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
        if (match)
            return match[1];
        return null;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Schema Access
    // ─────────────────────────────────────────────────────────────────────────
    getSchemaPath() {
        return this.schemaPath;
    }
    getTable(tableName) {
        return this.tables.get(tableName.toLowerCase());
    }
    getIndex(indexName) {
        return this.indexes.get(indexName.toLowerCase());
    }
    getAllTables() {
        return new Map(this.tables);
    }
    getAllIndexes() {
        return new Map(this.indexes);
    }
    getAllStatements() {
        return [...this.statements];
    }
    getTablesByLayer(layer) {
        return Object.entries(TABLE_LAYERS)
            .filter(([_, l]) => l === layer)
            .map(([name, _]) => name);
    }
    getLayerStatements(layer) {
        const statements = [];
        const tables = this.getTablesByLayer(layer);
        // Add tables
        for (const table of tables) {
            const stmt = this.getTable(table);
            if (stmt)
                statements.push(stmt);
        }
        // Add indexes for these tables
        for (const [_, stmt] of this.indexes) {
            const match = stmt.match(/ON\s+(\w+)/i);
            if (match && tables.includes(match[1].toLowerCase())) {
                statements.push(stmt);
            }
        }
        return statements;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Database Initialization
    // ─────────────────────────────────────────────────────────────────────────
    execStatements(db, statements) {
        for (const stmt of statements) {
            db.exec(stmt);
        }
        return statements.length;
    }
    initLayer(db, layer) {
        return this.execStatements(db, this.getLayerStatements(layer));
    }
    initCoreTables(db) {
        return this.initLayer(db, 'core');
    }
    initHandleTables(db) {
        return this.initLayer(db, 'handle');
    }
    initVectorTables(db, enableFts = true) {
        const statements = this.getLayerStatements('vector')
            .filter(s => enableFts || !s.toLowerCase().includes('fts'));
        return this.execStatements(db, statements);
    }
    initSemanticTables(db) {
        return this.initLayer(db, 'semantic');
    }
    initGraphTables(db) {
        return this.initLayer(db, 'graph');
    }
    initAllTables(db, options = {}) {
        const { enableFts = true, enableGraph = true, enableSemantic = true } = options;
        let count = 0;
        count += this.initCoreTables(db);
        count += this.initHandleTables(db);
        count += this.initVectorTables(db, enableFts);
        if (enableSemantic) {
            count += this.initSemanticTables(db);
        }
        if (enableGraph) {
            count += this.initGraphTables(db);
        }
        return count;
    }
    initVec0Table(db, dimensions) {
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS mcard_vec USING vec0(
                metadata_id INTEGER PRIMARY KEY,
                embedding float[${dimensions}]
            )
        `);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Convenience Exports (Backward Compatibility)
// ─────────────────────────────────────────────────────────────────────────────
// These are lazy-loaded from the singleton
let _cachedSchemas = {};
function getSchemaInstance() {
    return MCardSchema.getInstance();
}
// Core schemas
export const CARD_TABLE_SCHEMA = getSchemaInstance().getTable('card') || '';
export const HANDLE_REGISTRY_SCHEMA = getSchemaInstance().getTable('handle_registry') || '';
export const HANDLE_HISTORY_SCHEMA = getSchemaInstance().getTable('handle_history') || '';
export const HANDLE_INDEX_SCHEMA = getSchemaInstance().getIndex('idx_handle_current_hash') || '';
// Vector schemas
export const VECTOR_METADATA_SCHEMA = getSchemaInstance().getTable('mcard_vector_metadata') || '';
export const VECTOR_METADATA_INDEX = getSchemaInstance().getIndex('idx_vector_metadata_hash') || '';
export const VECTOR_EMBEDDINGS_SCHEMA = getSchemaInstance().getTable('mcard_embeddings') || '';
export const VECTOR_FTS_SCHEMA = getSchemaInstance().getTable('mcard_fts') || '';
// Semantic versioning schemas
export const HANDLE_VERSION_VECTORS_SCHEMA = getSchemaInstance().getTable('handle_version_vectors') || '';
export const HANDLE_VERSION_VECTORS_INDEXES = [
    getSchemaInstance().getIndex('idx_hvv_handle'),
    getSchemaInstance().getIndex('idx_hvv_hash'),
    getSchemaInstance().getIndex('idx_hvv_current'),
    getSchemaInstance().getIndex('idx_hvv_parent'),
].filter(Boolean).join('; ');
export const VERSION_SIMILARITY_CACHE_SCHEMA = getSchemaInstance().getTable('version_similarity_cache') || '';
export const VERSION_SIMILARITY_CACHE_INDEX = getSchemaInstance().getIndex('idx_vsc_handle') || '';
// Graph schemas
export const GRAPH_ENTITY_SCHEMA = getSchemaInstance().getTable('graph_entities') || '';
export const GRAPH_ENTITY_INDEX_NAME = getSchemaInstance().getIndex('idx_entity_name') || '';
export const GRAPH_ENTITY_INDEX_TYPE = getSchemaInstance().getIndex('idx_entity_type') || '';
export const GRAPH_ENTITY_INDEX_SOURCE = getSchemaInstance().getIndex('idx_entity_source') || '';
export const GRAPH_RELATIONSHIP_SCHEMA = getSchemaInstance().getTable('graph_relationships') || '';
export const GRAPH_RELATIONSHIP_INDEX_SOURCE = getSchemaInstance().getIndex('idx_rel_source') || '';
export const GRAPH_RELATIONSHIP_INDEX_TARGET = getSchemaInstance().getIndex('idx_rel_target') || '';
export const GRAPH_COMMUNITY_SCHEMA = getSchemaInstance().getTable('graph_communities') || '';
export const GRAPH_COMMUNITY_INDEX_LEVEL = getSchemaInstance().getIndex('idx_community_level') || '';
export const GRAPH_EXTRACTION_SCHEMA = getSchemaInstance().getTable('graph_extractions') || '';
// Schema collections
export const CORE_SCHEMAS = {
    card: CARD_TABLE_SCHEMA,
    handleRegistry: HANDLE_REGISTRY_SCHEMA,
    handleHistory: HANDLE_HISTORY_SCHEMA,
    handleIndex: HANDLE_INDEX_SCHEMA,
};
export const VECTOR_SCHEMAS = {
    metadata: VECTOR_METADATA_SCHEMA,
    metadataIndex: VECTOR_METADATA_INDEX,
    embeddings: VECTOR_EMBEDDINGS_SCHEMA,
    fts: VECTOR_FTS_SCHEMA,
};
export const SEMANTIC_SCHEMAS = {
    handleVersionVectors: HANDLE_VERSION_VECTORS_SCHEMA,
    handleVersionVectorsIndexes: HANDLE_VERSION_VECTORS_INDEXES,
    similarityCache: VERSION_SIMILARITY_CACHE_SCHEMA,
    similarityCacheIndex: VERSION_SIMILARITY_CACHE_INDEX,
};
export const GRAPH_SCHEMAS = {
    entities: GRAPH_ENTITY_SCHEMA,
    entityIndexName: GRAPH_ENTITY_INDEX_NAME,
    entityIndexType: GRAPH_ENTITY_INDEX_TYPE,
    entityIndexSource: GRAPH_ENTITY_INDEX_SOURCE,
    relationships: GRAPH_RELATIONSHIP_SCHEMA,
    relIndexSource: GRAPH_RELATIONSHIP_INDEX_SOURCE,
    relIndexTarget: GRAPH_RELATIONSHIP_INDEX_TARGET,
    communities: GRAPH_COMMUNITY_SCHEMA,
    communityIndexLevel: GRAPH_COMMUNITY_INDEX_LEVEL,
    extractions: GRAPH_EXTRACTION_SCHEMA,
};
// ─────────────────────────────────────────────────────────────────────────────
// Initialization Functions (use singleton internally)
// ─────────────────────────────────────────────────────────────────────────────
export function initCoreSchemas(db) {
    const schema = MCardSchema.getInstance();
    // Initialize both core (card) and handle tables (handle_registry, handle_history)
    // because they are fundamental to MCard operation
    schema.initCoreTables(db);
    schema.initHandleTables(db);
}
export function initVectorSchemas(db, enableFts = true) {
    MCardSchema.getInstance().initVectorTables(db, enableFts);
}
export function initSemanticSchemas(db) {
    MCardSchema.getInstance().initSemanticTables(db);
}
export function initGraphSchemas(db) {
    MCardSchema.getInstance().initGraphTables(db);
}
export function initAllSchemas(db, options = {}) {
    MCardSchema.getInstance().initAllTables(db, options);
}
// Dynamic schema generator (dimensions can't come from SQL file)
export function getVec0Schema(dimensions) {
    return `
CREATE VIRTUAL TABLE IF NOT EXISTS mcard_vec USING vec0(
    metadata_id INTEGER PRIMARY KEY,
    embedding float[${dimensions}]
)
`;
}
//# sourceMappingURL=schema.js.map
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
export type SchemaLayer = 'core' | 'handle' | 'vector' | 'semantic' | 'graph' | 'metadata';
/**
 * Singleton class for MCard database schema management.
 *
 * Ensures all schema definitions come from the single source of truth:
 * schema/mcard_schema.sql
 */
export declare class MCardSchema {
    private static instance;
    private schemaPath;
    private rawSql;
    private statements;
    private tables;
    private indexes;
    private loaded;
    private constructor();
    /**
     * Get the singleton instance.
     */
    static getInstance(): MCardSchema;
    /**
     * Reset the singleton (for testing).
     */
    static resetInstance(): void;
    private load;
    private parseStatements;
    private extractName;
    getSchemaPath(): string;
    getTable(tableName: string): string | undefined;
    getIndex(indexName: string): string | undefined;
    getAllTables(): Map<string, string>;
    getAllIndexes(): Map<string, string>;
    getAllStatements(): string[];
    getTablesByLayer(layer: SchemaLayer): string[];
    getLayerStatements(layer: SchemaLayer): string[];
    private execStatements;
    initLayer(db: {
        exec: (sql: string) => void;
    }, layer: SchemaLayer): number;
    initCoreTables(db: {
        exec: (sql: string) => void;
    }): number;
    initHandleTables(db: {
        exec: (sql: string) => void;
    }): number;
    initVectorTables(db: {
        exec: (sql: string) => void;
    }, enableFts?: boolean): number;
    initSemanticTables(db: {
        exec: (sql: string) => void;
    }): number;
    initGraphTables(db: {
        exec: (sql: string) => void;
    }): number;
    initAllTables(db: {
        exec: (sql: string) => void;
    }, options?: {
        enableFts?: boolean;
        enableGraph?: boolean;
        enableSemantic?: boolean;
    }): number;
    initVec0Table(db: {
        exec: (sql: string) => void;
    }, dimensions: number): void;
}
export declare const CARD_TABLE_SCHEMA: string;
export declare const HANDLE_REGISTRY_SCHEMA: string;
export declare const HANDLE_HISTORY_SCHEMA: string;
export declare const HANDLE_INDEX_SCHEMA: string;
export declare const VECTOR_METADATA_SCHEMA: string;
export declare const VECTOR_METADATA_INDEX: string;
export declare const VECTOR_EMBEDDINGS_SCHEMA: string;
export declare const VECTOR_FTS_SCHEMA: string;
export declare const HANDLE_VERSION_VECTORS_SCHEMA: string;
export declare const HANDLE_VERSION_VECTORS_INDEXES: string;
export declare const VERSION_SIMILARITY_CACHE_SCHEMA: string;
export declare const VERSION_SIMILARITY_CACHE_INDEX: string;
export declare const GRAPH_ENTITY_SCHEMA: string;
export declare const GRAPH_ENTITY_INDEX_NAME: string;
export declare const GRAPH_ENTITY_INDEX_TYPE: string;
export declare const GRAPH_ENTITY_INDEX_SOURCE: string;
export declare const GRAPH_RELATIONSHIP_SCHEMA: string;
export declare const GRAPH_RELATIONSHIP_INDEX_SOURCE: string;
export declare const GRAPH_RELATIONSHIP_INDEX_TARGET: string;
export declare const GRAPH_COMMUNITY_SCHEMA: string;
export declare const GRAPH_COMMUNITY_INDEX_LEVEL: string;
export declare const GRAPH_EXTRACTION_SCHEMA: string;
export declare const CORE_SCHEMAS: {
    card: string;
    handleRegistry: string;
    handleHistory: string;
    handleIndex: string;
};
export declare const VECTOR_SCHEMAS: {
    metadata: string;
    metadataIndex: string;
    embeddings: string;
    fts: string;
};
export declare const SEMANTIC_SCHEMAS: {
    handleVersionVectors: string;
    handleVersionVectorsIndexes: string;
    similarityCache: string;
    similarityCacheIndex: string;
};
export declare const GRAPH_SCHEMAS: {
    entities: string;
    entityIndexName: string;
    entityIndexType: string;
    entityIndexSource: string;
    relationships: string;
    relIndexSource: string;
    relIndexTarget: string;
    communities: string;
    communityIndexLevel: string;
    extractions: string;
};
export declare function initCoreSchemas(db: {
    exec: (sql: string) => void;
}): void;
export declare function initVectorSchemas(db: {
    exec: (sql: string) => void;
}, enableFts?: boolean): void;
export declare function initSemanticSchemas(db: {
    exec: (sql: string) => void;
}): void;
export declare function initGraphSchemas(db: {
    exec: (sql: string) => void;
}): void;
export declare function initAllSchemas(db: {
    exec: (sql: string) => void;
}, options?: {
    enableFts?: boolean;
    enableGraph?: boolean;
    enableSemantic?: boolean;
}): void;
export declare function getVec0Schema(dimensions: number): string;
//# sourceMappingURL=schema.d.ts.map
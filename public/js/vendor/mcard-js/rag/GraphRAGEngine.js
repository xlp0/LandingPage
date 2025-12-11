import { GraphStore, storeExtractionResult } from './graph/store';
import { GraphExtractor } from './graph/extractor';
import { MCardVectorStore } from '../storage/VectorStore';
import { chatMonad } from '../ptr/llm/LLMRuntime';
const GRAPHRAG_SYSTEM_PROMPT = `You are a helpful assistant that answers questions using both document context and a knowledge graph.

You have access to:
1. DOCUMENT CONTEXT: Relevant text passages from the knowledge base
2. GRAPH CONTEXT: Entities and their relationships from the knowledge graph

Use both sources to provide comprehensive, accurate answers.
- Cite sources [1], [2], etc. for document context
- Reference entities by name when using graph information
- If the graph shows relationships that help answer the question, describe them

Be thorough but concise. Acknowledge if information is incomplete.`;
const GRAPH_QUERY_PROMPT = `Question: {question}

=== DOCUMENT CONTEXT ===
{vector_context}

=== KNOWLEDGE GRAPH ===
Entities: {entities}
Relationships: {relationships}

Please provide a comprehensive answer using both the document context and knowledge graph information.`;
export class GraphRAGEngine {
    vectorStore;
    graphStore;
    extractor;
    llmModel;
    config;
    constructor(vectorDbPath, graphDbPath = null, llmModel = 'gemma3:latest', config = {}) {
        this.config = config;
        this.llmModel = llmModel;
        // Init vector store
        this.vectorStore = new MCardVectorStore(vectorDbPath, config);
        // Init graph store
        const gPath = graphDbPath || vectorDbPath;
        this.graphStore = new GraphStore(gPath);
        // Init extractor
        // GraphExtractor constructor expects config object
        this.extractor = new GraphExtractor({ model: llmModel, ...config });
    }
    async index(mcard, extractGraph = true, force = false) {
        const stats = { vectors: 0, entities: 0, relationships: 0 };
        let content = mcard.getContentAsText();
        // Vector index
        // We always index (INSERT OR REPLACE)
        stats.vectors = await this.vectorStore.index(mcard.hash, content);
        // Graph extract
        if (extractGraph && (force || !(await this.graphStore.isExtracted(mcard.hash)))) {
            const result = await this.extractor.extract(content);
            if (result.success) {
                const [entCount, relCount] = storeExtractionResult(this.graphStore, result, mcard.hash);
                stats.entities = entCount;
                stats.relationships = relCount;
            }
        }
        return stats;
    }
    async query(question, k = 5, useGraph = true) {
        // Vector Search
        const results = await this.vectorStore.search(question, k);
        const contextParts = [];
        const sources = [];
        results.forEach((r, i) => {
            const chunk = r.content || `[Content from ${r.hash.substring(0, 8)}]`;
            contextParts.push(`[${i + 1}] ${chunk}`);
            sources.push(r.hash);
        });
        const vectorContext = contextParts.join('\n\n');
        // Graph Search
        let entities = [];
        let relationships = [];
        let graphContext = "";
        if (useGraph) {
            const graphData = await this._getGraphContext(question, sources);
            entities = graphData.entities;
            relationships = graphData.relationships;
            if (entities.length > 0) {
                const entStr = entities.slice(0, 10).map(e => `${e.name} (${e.type})`).join(', ');
                const relStr = relationships.slice(0, 15).map(r => `${r.source} --${r.relationship}-> ${r.target}`).join('\n');
                graphContext = `Entities: ${entStr}\nRelationships:\n${relStr}`;
            }
        }
        // LLM Generation
        let answer = "";
        if (!vectorContext && entities.length === 0) {
            answer = "I couldn't find relevant information.";
        }
        else {
            const entStr = entities.length ? entities.map(e => `${e.name} (${e.type})`).join(', ') : "None found";
            const relStr = relationships.length ? relationships.map(r => `  - ${r.source} --${r.relationship}-> ${r.target}`).join('\n') : "None found";
            const prompt = GRAPH_QUERY_PROMPT
                .replace('{question}', question)
                .replace('{vector_context}', vectorContext || "No document context available.")
                .replace('{entities}', entStr)
                .replace('{relationships}', relStr);
            const monad = chatMonad(null, // messages null
            prompt, GRAPHRAG_SYSTEM_PROMPT, { model: this.llmModel, temperature: 0.3 });
            const result = await monad.run();
            if (result.isRight) {
                const val = result.right;
                answer = typeof val === 'object' ? val.content : val;
            }
            else {
                answer = `Error: ${result.left}`;
            }
        }
        return {
            answer,
            sources,
            entities,
            relationships,
            graphContext,
            vectorContext,
            confidence: 0.8 // placeholder
        };
    }
    async _getGraphContext(query, sourceHashes) {
        const entities = [];
        const seenIds = new Set();
        // Word search
        const words = query.split(/\s+/).filter(w => w.length > 3);
        const uniqueWords = [...new Set(words)]; // dedupe words
        for (const word of uniqueWords) {
            // Check if searchEntities exists on GraphStore
            const found = await this.graphStore.searchEntities(word, undefined, 5);
            for (const ent of found) {
                if (!seenIds.has(ent.id)) {
                    seenIds.add(ent.id);
                    entities.push(ent);
                }
            }
        }
        // Source search
        const uniquesources = [...new Set(sourceHashes)].slice(0, 3);
        for (const hash of uniquesources) {
            const found = await this.graphStore.getEntitiesBySource(hash);
            for (const ent of found) {
                if (!seenIds.has(ent.id)) {
                    seenIds.add(ent.id);
                    entities.push(ent);
                }
            }
        }
        // Get Relationships
        const relationships = [];
        for (const ent of entities) {
            const outRels = await this.graphStore.getRelationshipsFrom(ent.id);
            for (const r of outRels) {
                relationships.push({
                    source: ent.name,
                    relationship: r.relationship,
                    target: r.targetName
                });
            }
            // Limit per entity to avoid explosion
            if (relationships.length > 50)
                break;
        }
        return { entities, relationships };
    }
}
//# sourceMappingURL=GraphRAGEngine.js.map
/**
 * Community Detection and Summarization
 *
 * Label Propagation Algorithm (LPA) for community detection
 * and LLM-based hierarchical summarization.
 *
 * Mirrors Python: mcard/rag/graph/community.py
 */
// ─────────────────────────────────────────────────────────────────────────────
// Community Detection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Detect communities using asynchronous Label Propagation.
 *
 * @param store - GraphStore instance
 * @param maxIter - Maximum iterations
 * @returns List of communities, where each community is a list of entity IDs
 */
export function detectCommunities(store, maxIter = 20) {
    console.info('Starting community detection (LPA)...');
    // 1. Build Adjacency List from database
    const adj = new Map();
    const nodes = new Set();
    // Get all relationships and build undirected adjacency list
    const stmt = store.db.prepare('SELECT source_entity_id, target_entity_id FROM graph_relationships');
    const rows = stmt.all();
    for (const { source_entity_id: src, target_entity_id: tgt } of rows) {
        // Add both directions for undirected graph
        if (!adj.has(src))
            adj.set(src, []);
        if (!adj.has(tgt))
            adj.set(tgt, []);
        adj.get(src).push(tgt);
        adj.get(tgt).push(src);
        nodes.add(src);
        nodes.add(tgt);
    }
    const nodeList = Array.from(nodes);
    if (nodeList.length === 0) {
        console.warn('No nodes found for community detection');
        return [];
    }
    console.debug(`Graph size: ${nodes.size} nodes, ${rows.length} edges`);
    // 2. Initialize Labels (each node starts in its own community)
    const labels = new Map();
    for (const node of nodes) {
        labels.set(node, node);
    }
    // 3. Propagate Labels
    for (let i = 0; i < maxIter; i++) {
        let changes = 0;
        // Shuffle nodes for asynchronous update
        shuffleArray(nodeList);
        for (const node of nodeList) {
            const neighbors = adj.get(node) || [];
            if (neighbors.length === 0)
                continue;
            // Count neighbor labels
            const neighborLabels = neighbors.map(n => labels.get(n));
            const counts = new Map();
            for (const label of neighborLabels) {
                counts.set(label, (counts.get(label) || 0) + 1);
            }
            // Find most frequent label (ties broken randomly)
            let maxFreq = 0;
            for (const count of counts.values()) {
                if (count > maxFreq)
                    maxFreq = count;
            }
            const bestLabels = [];
            for (const [label, count] of counts.entries()) {
                if (count === maxFreq)
                    bestLabels.push(label);
            }
            const newLabel = bestLabels[Math.floor(Math.random() * bestLabels.length)];
            if (labels.get(node) !== newLabel) {
                labels.set(node, newLabel);
                changes++;
            }
        }
        console.debug(`LPA Iteration ${i + 1}: ${changes} changes`);
        if (changes === 0) {
            console.info(`LPA converged after ${i + 1} iterations`);
            break;
        }
    }
    // 4. Group Communities
    const communities = new Map();
    for (const [node, label] of labels.entries()) {
        if (!communities.has(label)) {
            communities.set(label, []);
        }
        communities.get(label).push(node);
    }
    const result = Array.from(communities.values());
    console.info(`Detected ${result.length} communities`);
    // Sort for deterministic output (by size desc, then first ID)
    result.sort((a, b) => {
        if (b.length !== a.length)
            return b.length - a.length;
        return Math.min(...a) - Math.min(...b);
    });
    return result;
}
/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Community Summarization Prompts
// ─────────────────────────────────────────────────────────────────────────────
const SUMMARIZE_SYSTEM_PROMPT = `You are an expert graph analyst.
Your task is to summarize a "community" of related entities from a knowledge graph.
Focus on the common themes, purposes, or technologies that connect these entities.
Synthesize the descriptions into a cohesive whole.`;
const SUMMARIZE_USER_PROMPT = `Analyze the following list of entities and their descriptions which form a community in a knowledge graph.
Create a Title and valid JSON Summary.

--- BEGIN ENTITY LIST ---
{entity_text}
--- END ENTITY LIST ---

Requirement:
- Provide a short Title.
- Provide a detailed Summary of common themes.
- Output MUST be valid JSON in the format:
{
  "title": "Community Title",
  "summary": "Detailed summary..."
}`;
const DEFAULT_SUMMARIZER_CONFIG = {
    model: 'gemma3:latest',
    ollamaBaseUrl: 'http://localhost:11434',
};
/**
 * Summarizes graph communities using LLM.
 */
export class CommunitySummarizer {
    store;
    config;
    constructor(store, config = {}) {
        this.store = store;
        this.config = { ...DEFAULT_SUMMARIZER_CONFIG, ...config };
    }
    /**
     * Summarize communities and store them in the DB.
     *
     * @returns Count of summaries generated
     */
    async summarizeAndStore(communities) {
        let count = 0;
        for (const commIds of communities) {
            // Prepare context
            const entityText = this.prepareContext(commIds);
            if (!entityText)
                continue;
            try {
                const [title, summary] = await this.generateSummary(entityText);
                this.store.addCommunity(title, summary, commIds);
                count++;
                console.info(`Generated community: ${title}`);
            }
            catch (error) {
                console.error(`Failed to summarize community: ${error}`);
            }
        }
        return count;
    }
    /**
     * Prepare entity context for summarization
     */
    prepareContext(ids) {
        const lines = [];
        // Limit context size to first 30 entities
        for (const eid of ids.slice(0, 30)) {
            const ent = this.store.getEntityById(eid);
            if (ent) {
                lines.push(`- ${ent.name} (${ent.type}): ${ent.description}`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Generate summary using LLM
     */
    async generateSummary(entityText) {
        const prompt = SUMMARIZE_USER_PROMPT.replace('{entity_text}', entityText);
        const url = `${this.config.ollamaBaseUrl}/api/generate`;
        const payload = {
            model: this.config.model,
            prompt: `${SUMMARIZE_SYSTEM_PROMPT}\n\n${prompt}`,
            stream: false,
            options: {
                temperature: 0.3,
            }
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`LLM call failed: ${response.status}`);
        }
        const result = await response.json();
        const content = result.response || '';
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[0]);
                return [data.title || 'Unknown Community', data.summary || ''];
            }
            catch {
                // Fall through to fallback
            }
        }
        // Fallback if no JSON found
        return ['Community Summary', content.slice(0, 500)];
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Convenience Function
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Detect communities and optionally summarize them.
 *
 * @param store - GraphStore instance
 * @param summarize - Whether to generate LLM summaries
 * @param config - Summarizer configuration
 * @returns Object with communities and summary count
 */
export async function detectAndSummarizeCommunities(store, summarize = false, config) {
    const communities = detectCommunities(store);
    let summaryCount = 0;
    if (summarize && communities.length > 0) {
        const summarizer = new CommunitySummarizer(store, config);
        summaryCount = await summarizer.summarizeAndStore(communities);
    }
    return { communities, summaryCount };
}
//# sourceMappingURL=community.js.map
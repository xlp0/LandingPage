import { GraphStore } from './graph/store';
import { GraphExtractor } from './graph/extractor';
import { MCardVectorStore } from '../storage/VectorStore';
import { MCard } from '../model/MCard';
export interface GraphRAGResponse {
    answer: string;
    sources: string[];
    entities: any[];
    relationships: any[];
    graphContext: string;
    vectorContext: string;
    confidence: number;
    metadata?: any;
}
export declare class GraphRAGEngine {
    vectorStore: MCardVectorStore;
    graphStore: GraphStore;
    extractor: GraphExtractor;
    llmModel: string;
    config: any;
    constructor(vectorDbPath: string, graphDbPath?: string | null, llmModel?: string, config?: any);
    index(mcard: MCard, extractGraph?: boolean, force?: boolean): Promise<any>;
    query(question: string, k?: number, useGraph?: boolean): Promise<GraphRAGResponse>;
    private _getGraphContext;
}
//# sourceMappingURL=GraphRAGEngine.d.ts.map
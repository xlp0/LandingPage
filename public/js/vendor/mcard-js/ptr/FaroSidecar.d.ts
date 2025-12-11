import { Faro } from '@grafana/faro-web-sdk';
/**
 * Configuration for the Faro Observability Sidecar
 */
export interface FaroSidecarConfig {
    url: string;
    apiKey?: string;
    appName: string;
    appVersion: string;
    enableTracing?: boolean;
    namespace?: string;
    additionalInstrumentations?: any[];
}
/**
 * FaroSidecar - Integrates Grafana Faro for Frontend Observability
 *
 * Acts as an observability sidecar for the PTR, capturing:
 * - Logs
 * - Errors
 * - Web Vitals
 * - Traces (OpenTelemetry)
 * - User Sessions
 */
export declare class FaroSidecar {
    private static instance;
    private faro;
    private constructor();
    /**
     * Get the singleton instance of FaroSidecar
     */
    static getInstance(): FaroSidecar;
    /**
     * Initialize the Faro SDK
     *
     * @param config Configuration options
     * @returns The initialized Faro instance or null if not in a browser environment
     */
    initialize(config: FaroSidecarConfig): Faro | null;
    /**
     * Get the underlying Faro instance
     */
    getFaro(): Faro | null;
    /**
     * Manually push an error to Faro
     */
    pushError(error: Error, context?: Record<string, any>): void;
    /**
     * Manually push a log message to Faro
     */
    pushLog(message: string, context?: Record<string, any>): void;
    /**
     * Push a custom event
     */
    pushEvent(name: string, attributes?: Record<string, string>): void;
}
//# sourceMappingURL=FaroSidecar.d.ts.map
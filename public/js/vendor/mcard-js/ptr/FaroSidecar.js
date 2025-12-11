import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
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
export class FaroSidecar {
    static instance = null;
    faro = null;
    constructor() { }
    /**
     * Get the singleton instance of FaroSidecar
     */
    static getInstance() {
        if (!FaroSidecar.instance) {
            FaroSidecar.instance = new FaroSidecar();
        }
        return FaroSidecar.instance;
    }
    /**
     * Initialize the Faro SDK
     *
     * @param config Configuration options
     * @returns The initialized Faro instance or null if not in a browser environment
     */
    initialize(config) {
        // Ensure we are in a browser environment
        if (typeof window === 'undefined') {
            console.warn('[FaroSidecar] Not initializing Grafana Faro: Non-browser environment detected.');
            return null;
        }
        if (this.faro) {
            console.warn('[FaroSidecar] Grafana Faro is already initialized.');
            return this.faro;
        }
        const { url, apiKey, appName, appVersion, enableTracing = true, namespace = 'ptr_runtime', additionalInstrumentations = [] } = config;
        const instrumentations = [
            ...getWebInstrumentations(),
            ...additionalInstrumentations
        ];
        if (enableTracing) {
            instrumentations.push(new TracingInstrumentation());
        }
        const faroOptions = {
            url,
            apiKey,
            app: {
                name: appName,
                version: appVersion,
                namespace
            },
            instrumentations,
        };
        try {
            this.faro = initializeFaro(faroOptions);
            console.log(`[FaroSidecar] Grafana Faro initialized for ${appName}@${appVersion}`);
            // Auto-push a session start log
            this.faro.api.pushLog([`PTR Observability Sidecar started for ${appName}`]);
        }
        catch (error) {
            console.error('[FaroSidecar] Failed to initialize Grafana Faro:', error);
        }
        return this.faro;
    }
    /**
     * Get the underlying Faro instance
     */
    getFaro() {
        return this.faro;
    }
    /**
     * Manually push an error to Faro
     */
    pushError(error, context) {
        if (this.faro) {
            this.faro.api.pushError(error, { context });
        }
    }
    /**
     * Manually push a log message to Faro
     */
    pushLog(message, context) {
        if (this.faro) {
            this.faro.api.pushLog([message], { context });
        }
    }
    /**
     * Push a custom event
     */
    pushEvent(name, attributes) {
        if (this.faro) {
            this.faro.api.pushEvent(name, attributes);
        }
    }
}
//# sourceMappingURL=FaroSidecar.js.map
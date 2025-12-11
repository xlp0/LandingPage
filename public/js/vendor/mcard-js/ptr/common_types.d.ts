/**
 * Common types for PTR system
 * Matches python mcard.ptr.core.common_types
 */
export type PrimeHash = string;
export interface PolynomialTerm {
    coefficient: PrimeHash;
    exponent: PrimeHash;
    weight: number;
}
export interface SafetyViolation {
    property: string;
    violation_type: string;
    details: string;
    timestamp: string;
}
export interface LivenessMetric {
    goal: string;
    progress: number;
    timestamp: string;
}
export declare enum VerificationStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    FAILED = "failed",
    SKIPPED = "skipped"
}
export interface ExecutionResult {
    success: boolean;
    output: unknown;
    verification_vcard: string | null;
    execution_time_ms: number;
    alignment_score?: number;
    invariants_preserved: boolean;
    safety_violations: SafetyViolation[];
    liveness_metrics: LivenessMetric[];
    error_message?: string;
}
//# sourceMappingURL=common_types.d.ts.map
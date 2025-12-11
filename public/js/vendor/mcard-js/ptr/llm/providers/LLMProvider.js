/**
 * LLM Provider Interface
 *
 * Abstract interface for LLM providers.
 * Replicates mcard.ptr.core.llm.providers.base.LLMProvider
 */
export class BaseLLMProvider {
    async get_status() {
        const available = await this.validate_connection();
        let models = [];
        if (available) {
            const result = await this.list_models();
            if (result.isRight) {
                models = result.right;
            }
            else {
                models = result.left; // Error message
            }
        }
        else {
            models = "Not connected";
        }
        return {
            provider: this.provider_name,
            available,
            models: Array.isArray(models) ? models : [],
            error: typeof models === 'string' ? models : null
        };
    }
}
//# sourceMappingURL=LLMProvider.js.map
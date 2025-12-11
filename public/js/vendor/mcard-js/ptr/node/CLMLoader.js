/**
 * CLMLoader - Load and parse Cubical Logic Model files
 *
 * Supports YAML CLM specifications from chapters/
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
/**
 * Map balanced.test_cases to examples, preserving original input content.
 *
 * The flag `treatEmptyWhenAsGiven` controls how empty `when` blocks are
 * interpreted:
 * - legacy root format kept `input` as `given` when `when` was empty
 * - standard clm.balanced format treated an empty object as a valid input
 */
function mapTestCasesToExamples(testCases, treatEmptyWhenAsGiven) {
    return testCases.map((tc) => {
        let input = tc.given;
        if (tc.when) {
            const params = tc.when.params || {};
            const context = tc.when.context || {};
            const hasParams = Object.keys(params).length > 0;
            const hasContext = Object.keys(context).length > 0;
            const hasWhenKeys = typeof tc.when === 'object' && Object.keys(tc.when).length > 0;
            if (hasParams || hasContext) {
                input = { ...tc.when, ...context, ...params };
                if (input.__input_content__ === undefined) {
                    input.__input_content__ = tc.given;
                }
            }
            else if (tc.when &&
                typeof tc.when === 'object' &&
                (!treatEmptyWhenAsGiven || hasWhenKeys)) {
                input = { ...tc.when };
                if (input.__input_content__ === undefined) {
                    input.__input_content__ = tc.given;
                }
            }
        }
        return {
            name: tc.name || `Test Case: ${tc.given}`,
            input,
            expected_output: tc.then?.result,
            result_contains: tc.then?.result_contains,
        };
    });
}
export class CLMLoader {
    basePath;
    constructor(basePath = process.cwd()) {
        this.basePath = basePath;
    }
    /**
     * Load a CLM file from path
     */
    load(clmPath) {
        const fullPath = path.isAbsolute(clmPath)
            ? clmPath
            : path.resolve(this.basePath, clmPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = yaml.parse(content);
        // Normalize legacy format (abstract/concrete/balanced at root)
        if (parsed.abstract && !parsed.clm) {
            // Match Python: use metadata.name, fallback to filename
            const basename = path.basename(fullPath);
            const title = parsed.metadata?.name || basename;
            const spec = {
                version: '1.0',
                chapter: { id: 0, title },
                clm: {
                    abstract: parsed.abstract,
                    concrete: parsed.concrete,
                    balanced: parsed.balanced
                }
            };
            // Map balanced.test_cases to examples
            if (parsed.balanced?.test_cases) {
                // Legacy behavior: treat empty `when` as "no override", keeping input = given
                spec.examples = mapTestCasesToExamples(parsed.balanced.test_cases, true);
            }
            return spec;
        }
        // Standard format: check clm.balanced.test_cases
        if (parsed.clm?.balanced?.test_cases && !parsed.examples) {
            // Standard behavior: allow empty `when` to become an explicit (possibly empty) input object
            parsed.examples = mapTestCasesToExamples(parsed.clm.balanced.test_cases, false);
        }
        // Map balanced.examples (used in advanced_comparison.yaml)
        if (parsed.clm?.balanced?.examples && !parsed.examples) {
            parsed.examples = parsed.clm.balanced.examples.map((ex, i) => ({
                name: `Example ${i + 1}`,
                input: ex,
                expected_output: undefined
            }));
        }
        return parsed;
    }
    /**
     * Load all CLM files from a directory
     */
    loadDirectory(dirPath) {
        const fullPath = path.resolve(this.basePath, dirPath);
        const files = fs.readdirSync(fullPath);
        const clmFiles = new Map();
        for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.clm')) {
                const filePath = path.join(fullPath, file);
                try {
                    clmFiles.set(file, this.load(filePath));
                }
                catch (e) {
                    console.warn(`Failed to load ${file}:`, e);
                }
            }
        }
        return clmFiles;
    }
    /**
     * Load logic file content for a CLM
     */
    loadLogicFile(clm, chapterDir) {
        const config = clm.clm.concrete;
        // Check for inline code
        if (config.code) {
            return config.code;
        }
        // Try runtimes_config for JavaScript
        if (config.runtimes_config) {
            const jsConfig = config.runtimes_config.find(r => r.name === 'javascript');
            if (jsConfig?.file) {
                const logicPath = path.resolve(this.basePath, chapterDir, jsConfig.file);
                return fs.readFileSync(logicPath, 'utf-8');
            }
        }
        // Try code_file
        if (config.code_file) {
            const logicPath = path.resolve(this.basePath, chapterDir, config.code_file);
            if (fs.existsSync(logicPath)) {
                return fs.readFileSync(logicPath, 'utf-8');
            }
        }
        return null;
    }
}
//# sourceMappingURL=CLMLoader.js.map
"""
Polyglot Comparison Logic.
Orchestrates the execution of addition across multiple runtimes and verifies consensus.
"""
from typing import Any, Dict, List
from mcard.ptr.core.clm_template import NarrativeMonad, IO, Either
from mcard.ptr.core.runtime import RuntimeFactory
from mcard import MCard
import os
import json

def compare_runtimes_logic(_: Any) -> NarrativeMonad:
    """
    Executes addition in Python, JS, Rust, C, WASM, and Lean.
    Compares results and generates a consensus report.
    """
    context_monad = NarrativeMonad.get_context()
    
    def process(ctx: Dict) -> NarrativeMonad:
        # 1. Define the task inputs from context (injected from YAML)
        # Note: 'a' and 'b' are runtime inputs, 'runtimes' is configuration
        a = ctx.get("a", 0)
        b = ctx.get("b", 0)
        expected_sum = a + b
        
        # 2. Get runtimes configuration from context
        # The loader merges YAML 'concrete' params into the context or we access them via a specific key
        # For this refactor, we assume the caller (loader/test) injects 'runtimes_config' into ctx
        # OR we can access the 'concrete' definition if passed.
        # However, standard CLM flow passes 'context' as user input.
        # To keep it clean, we'll look for 'runtimes_config' in the context, 
        # which we will ensure is populated from the YAML by the loader or the test setup.
        
        runtimes = ctx.get("runtimes_config", [])
        if not runtimes:
            return NarrativeMonad.log("Error: No runtimes configuration found in context").bind(
                lambda _: NarrativeMonad.unit({"consensus": False, "error": "Missing configuration"})
            )
        
        results = {}
        errors = []
        
        # 3. Execute in each runtime (IO Effect)
        def execute_all() -> Dict[str, Any]:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            target = MCard("dummy")
            
            execution_results = {}
            
            for rt in runtimes:
                name = rt["name"]
                executor = RuntimeFactory.get_executor(name)
                
                if not executor or not executor.validate_environment():
                    execution_results[name] = "Skipped (Unavailable)"
                    continue
                
                # Construct concrete implementation dict dynamically
                concrete = {"runtime": name}
                
                # Resolve paths
                if "file" in rt:
                    path = os.path.join(base_dir, rt["file"])
                    concrete["code_file"] = path
                    if name == "python":
                        concrete["operation"] = "custom"
                        with open(path, 'r') as f:
                            concrete["code"] = f.read()
                    elif name == "javascript":
                        with open(path, 'r') as f:
                            concrete["code"] = f.read()
                
                if "binary" in rt:
                    concrete["binary_path"] = os.path.join(base_dir, rt["binary"])
                    
                if "module" in rt:
                    concrete["wasm_module"] = os.path.join(base_dir, rt["module"])
                    
                if "entry" in rt:
                    concrete["entry_point"] = rt["entry"]
                    
                try:
                    res = executor.execute(concrete, target, ctx)
                    
                    # Parse result
                    if isinstance(res, str) and res.strip().replace('.','',1).isdigit():
                         try:
                             if '.' in res:
                                 res = float(res)
                             else:
                                 res = int(res)
                         except:
                             pass
                    
                    execution_results[name] = res
                except Exception as e:
                    execution_results[name] = f"Error: {str(e)}"
            
            return execution_results

        # Lift IO
        io_action = NarrativeMonad.lift_io(IO(execute_all))
        
        def process_results(results: Dict[str, Any]) -> NarrativeMonad:
            # 4. Verify Consensus (Balanced Expectation)
            consensus = True
            disagreements = []
            
            log_entries = []
            log_entries.append(f"--- Polyglot Arithmetic Comparison (a={a}, b={b}) ---")
            
            for name, res in results.items():
                if res == "Skipped (Unavailable)":
                    log_entries.append(f"[{name}] Skipped")
                    continue
                    
                if res != expected_sum:
                    consensus = False
                    disagreements.append(f"{name} produced {res}, expected {expected_sum}")
                    log_entries.append(f"[{name}] ❌ FAILED: {res}")
                else:
                    log_entries.append(f"[{name}] ✅ PASSED: {res}")
            
            # 5. Generate Evidence
            if consensus:
                evidence = "Consensus Achieved: All active runtimes agree."
                log_entries.append(f"RESULT: {evidence}")
                return NarrativeMonad.log("\n".join(log_entries)).bind(
                    lambda _: NarrativeMonad.unit({"consensus": True, "results": results})
                )
            else:
                evidence = f"Consensus Failed: {', '.join(disagreements)}"
                log_entries.append(f"RESULT: {evidence}")
                return NarrativeMonad.log("\n".join(log_entries)).bind(
                    lambda _: NarrativeMonad.unit({"consensus": False, "results": results, "errors": disagreements})
                )

        return io_action.bind(process_results)

    return context_monad.bind(process)

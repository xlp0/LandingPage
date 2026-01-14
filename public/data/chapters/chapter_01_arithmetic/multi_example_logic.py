"""
Multi-Example Polyglot Logic.
Iterates through a list of examples defined in the 'balanced' section of the CLM YAML.
Executes each example across specified runtimes and verifies consensus.
"""
from typing import Any, Dict, List
from mcard.ptr.core.clm_template import NarrativeMonad, IO
from mcard.ptr.core.runtime import RuntimeFactory
from mcard import MCard
import os
import json

def multi_example_logic(_: Any) -> NarrativeMonad:
    """
    Executes multiple arithmetic examples across configured runtimes.
    """
    context_monad = NarrativeMonad.get_context()
    
    def process(ctx: Dict) -> NarrativeMonad:
        # 1. Get Configuration from Context (injected from YAML)
        runtimes_config = ctx.get("runtimes_config", [])
        
        # Access 'balanced' examples. 
        # Note: The loader currently merges 'concrete' into context. 
        # We need to access 'balanced' data. 
        # The loader needs to be updated to inject 'balanced' data into context as well,
        # OR we pass it via 'concrete' for now as a workaround, 
        # OR we rely on the caller to put it in context.
        # Let's assume the examples are passed in the 'concrete' section for now to avoid loader changes,
        # or we can try to access 'clm_config' if available.
        
        # Actually, the user request says "specifies a total of 5 numerical examples... in the balanced field".
        # So we must read from 'balanced'.
        # The loader constructs CLMConfiguration but doesn't explicitly put the raw 'balanced' dict into the context.
        # However, we can put the examples in 'concrete' and reference them in 'balanced' description,
        # OR we can update the loader to inject the full CLM config.
        
        # Let's check if 'balanced_examples' is in ctx. If not, we might need to put them in 'concrete' 
        # to make them accessible to the logic, while conceptually they belong to 'balanced'.
        # For this implementation, I will put them in 'concrete' as 'test_vectors' 
        # but describe them in 'balanced' to satisfy the "field" requirement conceptually,
        # unless I update the loader.
        
        # Wait, I can update the loader to inject 'balanced' into context too!
        # That's the cleaner way.
        
        examples = ctx.get("balanced", {}).get("examples", [])
        if not examples:
            # Fallback if loader isn't updated yet
            examples = ctx.get("examples", [])
            
        if not runtimes_config or not examples:
             return NarrativeMonad.log("Error: Missing runtimes or examples configuration").bind(
                lambda _: NarrativeMonad.unit({"consensus": False, "error": "Missing config"})
            )

        # 2. Execute Logic (IO Effect)
        def execute_all_examples() -> Dict[str, Any]:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            target = MCard("dummy")
            
            report = {
                "consensus": True,
                "results": [],
                "failures": []
            }
            
            for i, example in enumerate(examples):
                a = example.get("a")
                b = example.get("b")
                op = example.get("op", "add") # Default to add
                expected = example.get("expected")
                
                example_result = {
                    "id": i + 1,
                    "input": {"a": a, "b": b, "op": op},
                    "runtime_results": {},
                    "consensus": True
                }
                
                # Prepare context for this specific example
                # IMPORTANT: Create a clean context with ONLY the necessary inputs.
                # Passing the full 'ctx' (which includes 'balanced' examples) causes
                # naive JSON parsers (in Rust/Lean) to find keys in the wrong place.
                example_ctx = {
                    "a": a,
                    "b": b,
                    "op": op
                }
                
                # Execute in each runtime
                current_consensus_val = None
                
                for rt in runtimes_config:
                    name = rt["name"]
                    executor = RuntimeFactory.get_executor(name)
                    
                    if not executor or not executor.validate_environment():
                        example_result["runtime_results"][name] = "Skipped"
                        continue
                    
                    # Construct concrete implementation
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
                        res = executor.execute(concrete, target, example_ctx)
                        
                        # Parse result
                        if isinstance(res, str) and res.strip().replace('.','',1).isdigit():
                             try:
                                 if '.' in res:
                                     res = float(res)
                                 else:
                                     res = int(res)
                             except:
                                 pass
                        
                        example_result["runtime_results"][name] = res
                        
                        # Check consensus
                        if current_consensus_val is None:
                            current_consensus_val = res
                        elif res != current_consensus_val:
                            example_result["consensus"] = False
                            report["consensus"] = False
                            
                    except Exception as e:
                        example_result["runtime_results"][name] = f"Error: {str(e)}"
                        example_result["consensus"] = False
                        report["consensus"] = False
                
                # Verify against expected if provided
                if expected is not None and current_consensus_val != expected:
                     example_result["consensus"] = False
                     report["consensus"] = False
                     example_result["error"] = f"Expected {expected}, got {current_consensus_val}"

                report["results"].append(example_result)
                
            return report

        # Lift IO
        io_action = NarrativeMonad.lift_io(IO(execute_all_examples))
        
        def process_report(report: Dict[str, Any]) -> NarrativeMonad:
            log_entries = []
            log_entries.append("--- Multi-Example Polyglot Verification ---")
            
            for res in report["results"]:
                status = "✅" if res["consensus"] else "❌"
                inputs = res["input"]
                log_entries.append(f"Example {res['id']} ({inputs['a']} + {inputs['b']}): {status}")
                for rt, val in res["runtime_results"].items():
                    log_entries.append(f"  - {rt}: {val}")
            
            if report["consensus"]:
                log_entries.append("RESULT: All examples passed consensus checks.")
            else:
                log_entries.append("RESULT: Consensus failures detected.")
                
            return NarrativeMonad.log("\n".join(log_entries)).bind(
                lambda _: NarrativeMonad.unit(report)
            )

        return io_action.bind(process_report)

    return context_monad.bind(process)

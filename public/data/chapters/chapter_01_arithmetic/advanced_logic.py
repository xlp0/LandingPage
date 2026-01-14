"""
Advanced Polyglot Logic.
Supports Addition, Multiplication, and Trigonometry (Sine, Cosine) across multiple runtimes.
"""
from typing import Any, Dict, List
from mcard.ptr.core.clm_template import NarrativeMonad, IO
from mcard.ptr.core.runtime import RuntimeFactory
from mcard import MCard
import os
import json
import math

def advanced_polyglot_logic(_: Any) -> NarrativeMonad:
    """
    Executes mixed arithmetic and trig operations across runtimes.
    """
    context_monad = NarrativeMonad.get_context()
    
    def process(ctx: Dict) -> NarrativeMonad:
        runtimes_config = ctx.get("runtimes_config", [])
        examples = ctx.get("balanced", {}).get("examples", [])
        
        if not runtimes_config or not examples:
             return NarrativeMonad.log("Error: Missing runtimes or examples configuration").bind(
                lambda _: NarrativeMonad.unit({"consensus": False, "error": "Missing config"})
            )

        def execute_all_examples() -> Dict[str, Any]:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            target = MCard("dummy")
            
            report = {
                "consensus": True,
                "results": [],
                "failures": []
            }

            # Initialize results structure
            results_by_runtime = {}
            for rt in runtimes_config:
                results_by_runtime[rt["name"]] = []

            # Split runtimes
            batch_capable = ["python", "javascript", "c", "julia"]
            batch_group = [rt for rt in runtimes_config if rt["name"] in batch_capable]
            seq_group = [rt for rt in runtimes_config if rt["name"] not in batch_capable]
            
            # Execute Batch Group
            if batch_group:
                batch_ctx = {"batch": True, "examples": examples}
                for rt in batch_group:
                    name = rt["name"]
                    executor = RuntimeFactory.get_executor(name)
                    
                    if not executor or not executor.validate_environment():
                        results_by_runtime[name] = ["Skipped"] * len(examples)
                        continue
                    
                    concrete = {"runtime": name}
                    # Resolve paths (Same logic as before)
                    if "file" in rt:
                        path = os.path.join(base_dir, rt["file"])
                        concrete["code_file"] = path
                        if name == "python":
                            concrete["operation"] = "custom"
                            with open(path, 'r') as f: concrete["code"] = f.read()
                        elif name == "javascript":
                            with open(path, 'r') as f: concrete["code"] = f.read()
                    if "binary" in rt: concrete["binary_path"] = os.path.join(base_dir, rt["binary"])
                    if "module" in rt: concrete["wasm_module"] = os.path.join(base_dir, rt["module"])
                    if "entry" in rt: concrete["entry_point"] = rt["entry"]

                    try:
                        batch_res_raw = executor.execute(concrete, target, batch_ctx)
                        # Process response
                        batch_res = []
                        if isinstance(batch_res_raw, list):
                            batch_res = batch_res_raw
                        elif isinstance(batch_res_raw, str):
                            try:
                                clean_res = batch_res_raw.strip()
                                if clean_res.startswith("[") and clean_res.endswith("]"):
                                    batch_res = json.loads(clean_res)
                                else:
                                    batch_res = [float(clean_res)]
                            except:
                                batch_res = [f"Parse Error: {batch_res_raw}"] * len(examples)
                        else:
                            batch_res = [batch_res_raw] * len(examples)

                        # Ensure length
                        if len(batch_res) != len(examples):
                            diff = len(examples) - len(batch_res)
                            if diff > 0: batch_res.extend([f"Missing Result {diff}"] * diff)
                            else: batch_res = batch_res[:len(examples)]
                        results_by_runtime[name] = batch_res
                    except Exception as e:
                        results_by_runtime[name] = [f"Error: {str(e)}"] * len(examples)
            
            # Execute Sequential Group
            if seq_group:
                for rt in seq_group:
                    name = rt["name"]
                    results_by_runtime[name] = []
                    
                    executor = RuntimeFactory.get_executor(name)
                    if not executor or not executor.validate_environment():
                        results_by_runtime[name] = ["Skipped"] * len(examples)
                        continue

                    concrete = {"runtime": name}
                    if "file" in rt:
                        path = os.path.join(base_dir, rt["file"])
                        concrete["code_file"] = path
                    if "binary" in rt: concrete["binary_path"] = os.path.join(base_dir, rt["binary"])
                    if "module" in rt: concrete["wasm_module"] = os.path.join(base_dir, rt["module"])
                    if "entry" in rt: concrete["entry_point"] = rt["entry"]

                    for ex in examples:
                        # Context for single execution
                        ex_ctx = {"op": ex.get("op"), "a": ex.get("a"), "b": ex.get("b")}
                        try:
                            res = executor.execute(concrete, target, ex_ctx)
                            val = None
                            if isinstance(res, (int, float)): val = res
                            elif isinstance(res, str):
                                try: val = float(res.strip())
                                except: pass
                            results_by_runtime[name].append(val)
                        except Exception as e:
                            results_by_runtime[name].append(f"Error: {e}")

            # Aggregating and Validating Results
            for i, example in enumerate(examples):
                op = example.get("op")
                a = example.get("a")
                b = example.get("b")
                
                # Calculate expected
                expected = None
                if op == "add": expected = a + b
                elif op == "mul": expected = a * b
                elif op == "sin": expected = math.sin(a)
                elif op == "cos": expected = math.cos(a)
                
                example_result = {
                    "id": i + 1,
                    "op": op,
                    "input": {"a": a, "b": b},
                    "expected": expected,
                    "runtime_results": {},
                    "consensus": True
                }

                current_consensus_val = None

                for rt in runtimes_config:
                    name = rt["name"]
                    val_raw = results_by_runtime[name][i]
                    
                    # Normalize value
                    val = None
                    if isinstance(val_raw, (int, float)):
                        val = val_raw
                    elif isinstance(val_raw, str):
                        try:
                            val = float(val_raw)
                            if val.is_integer(): val = int(val)
                        except:
                            val = val_raw # Keep error string

                    example_result["runtime_results"][name] = val

                    # Check Consensus
                    if isinstance(val, (int, float)):
                        if current_consensus_val is None:
                            current_consensus_val = val
                        else:
                            # Check diff
                            diff = abs(val - current_consensus_val)
                            if diff > 1e-3: # Tolerant check
                                print(f"Mismatch Ex {i}: {name}={val} vs {current_consensus_val}")
                                example_result["consensus"] = False
                                report["consensus"] = False
                    elif val != "Skipped":
                         example_result["consensus"] = False
                         report["consensus"] = False

                report["results"].append(example_result)
            
            return report

        io_action = NarrativeMonad.lift_io(IO(execute_all_examples))
        
        def process_report(report: Dict[str, Any]) -> NarrativeMonad:
            log_entries = []
            log_entries.append("--- Advanced Polyglot Verification ---")
            
            for res in report["results"]:
                status = "✅" if res["consensus"] else "❌"
                op = res["op"]
                inputs = res["input"]
                input_str = f"a={inputs['a']}"
                if inputs['b'] is not None:
                    input_str += f", b={inputs['b']}"
                    
                log_entries.append(f"[{op.upper()}] {input_str}: {status}")
                for rt, val in res["runtime_results"].items():
                    log_entries.append(f"  - {rt}: {val}")
            
            if report["consensus"]:
                log_entries.append("RESULT: All examples passed consensus checks.")
            else:
                log_entries.append("RESULT: Consensus failures detected.")
            
            # Debug print to see what's happening
            print("\n".join(log_entries))
                
            return NarrativeMonad.log("\n".join(log_entries)).bind(
                lambda _: NarrativeMonad.unit(report)
            )

        return io_action.bind(process_report)

    return context_monad.bind(process)

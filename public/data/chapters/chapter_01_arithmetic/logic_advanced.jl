
# Logic for Julia Runtime
# Supports add, mul, sin, cos
# Reads JSON from command line argument (simple parsing to avoid deps if possible, or use standard pkg)
# Julia has "JSON" package but it might not be installed by default.
# To be safe and dependency-free like the R script, we will use regex parsing for the simple input structure.

try
    args = ARGS
    if length(args) < 1
        println(stderr, "Error: No context provided")
        exit(1)
    end

    json_str = args[1]

    function get_val(json, key, type_converter)
        # Regex to find "key": value OR "key":value
        # Value can be number, string ("..."), or null
        # Julia regex: r"\"key\"\s*:\s*([^,}]+)"
        
        r = Regex("\"$key\"\\s*:\\s*([^,}]+)")
        m = match(r, json)
        
        if m === nothing
            return nothing
        end
        
        val_str = m.captures[1]
        
        # Clean up string
        val_str = strip(val_str)
        if startswith(val_str, "\"") && endswith(val_str, "\"")
            val_str = val_str[2:end-1]
        end
        
        if val_str == "null"
            return nothing
        end
        
        return type_converter(val_str)
    end

    # Helper to check for batch mode
    is_batch = occursin("\"batch\": true", json_str) || occursin("\"batch\":true", json_str)

    if is_batch
        # Batch Mode
        # Extract examples array content
        # "examples": [ ... ]
        m_ex = match(r"\"examples\"\s*:\s*\[(.*)\]"s, json_str)
        if m_ex === nothing
             # Fallback check if it spans multiple lines or complex format - simplify assumption: it's the valid part
             # Try simpler extraction if multiline regex failed (Julia regex dot matches newline with 's' flag)
             println("[]")
             exit(0)
        end
        
        content = m_ex.captures[1]
        
        # Split objects by "},{" 
        # This is a bit fragile but works for controlled inputs without nested objects
        items = split(content, r"\}\s*,\s*\{")
        
        results = Float64[]
        
        for item in items
            # Re-add braces for regex context if missing
            full_item = item
            if !startswith(strip(full_item), "{") full_item = "{" * full_item end
            if !endswith(strip(full_item), "}") full_item = full_item * "}" end
            
            op_local = get_val(full_item, "op", x -> String(x))
            a_local = get_val(full_item, "a", x -> parse(Float64, x))
            b_local = get_val(full_item, "b", x -> parse(Float64, x))
            
            a_v = a_local === nothing ? 0.0 : a_local
            b_v = b_local === nothing ? 0.0 : b_local
            
            res = 0.0
            if op_local == "add"
                res = a_v + b_v
            elseif op_local == "mul"
                res = a_v * b_v
            elseif op_local == "sin"
                res = sin(a_v)
            elseif op_local == "cos"
                res = cos(a_v)
            end
            push!(results, res)
        end
        
        # Format output as JSON array
        # JSON.jl not assumed, manual formatting
        print("[")
        for (i, r) in enumerate(results)
            if i > 1 print(", ") end
            if isinteger(r)
                print(Int(r))
            else
                print(r)
            end
        end
        println("]")
        
    else
        # Single Mode
        op = get_val(json_str, "op", x -> String(x))
        a_val = get_val(json_str, "a", x -> parse(Float64, x))
        b_val = get_val(json_str, "b", x -> parse(Float64, x))

        # Defaults
        a = a_val === nothing ? 0.0 : a_val
        b = b_val === nothing ? 0.0 : b_val

        result = 0.0

        if op == "add"
            result = a + b
        elseif op == "mul"
            result = a * b
        elseif op == "sin"
            result = sin(a)
        elseif op == "cos"
            result = cos(a)
        else
            # Default to 0 if unknown (safe fallback for tests)
            result = 0.0
        end

        # Print result
        if isinteger(result)
            println(Int(result))
        else
            println(result)
        end
    end

catch e
    # println(stderr, "Error in Julia execution: $e")
    # Output something that won't crash the JSON parser upstream, or exit 1
    exit(1)
end

def dummy_module_func(context):
    input_val = "Unknown"
    
    if isinstance(context, bytes):
        input_val = context.decode('utf-8')
    elif isinstance(context, dict):
         input_val = str(context.get('name', context.get('__input_content__', 'Unknown')))
    else:
        input_val = str(context)
        
    return f"Module Execution: {input_val}"

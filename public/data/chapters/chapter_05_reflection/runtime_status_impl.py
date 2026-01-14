from mcard.ptr.core.runtime import RuntimeFactory

# Get detailed status
status = RuntimeFactory.get_detailed_status()
RuntimeFactory.print_status(verbose=False)

# Return status dict
result = {
    'available_count': sum(1 for rt in status.values() if rt['available']),
    'total_count': len(status),
    'at_least_one_available': RuntimeFactory.at_least_one_available(),
    'runtimes': status
}

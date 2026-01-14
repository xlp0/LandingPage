"""
Python implementation of Long Session Simulation
Replaces the JavaScript version which requires context.runCLM support.
"""

import random
import json
import time

message_pools = {
    "System": [
        "System check initiated.", "Optimization complete.", "Warning: CPU load high.",
        "Garbage collection active.", "Re-routing power.", "Updating firmware.",
        "Ping received.", "Log rotation scheduled.", "Daemon started.", "Connection stable."
    ],
    "User": [
        "Hello?", "Can you process this?", "Running diagnostics.", "Where is the file?",
        "Please reboot.", "Access code: 7734.", "Initiating transfer.", "Override command.",
        "Checking status.", "Logout requested."
    ],
    "Bot": [
        "Processing.", "I cannot do that, Dave.", "Calculating pi.", "Task queued.",
        "Memory allocated.", "Logic gate open.", "Analyzing input.", "Response generated.",
        "Error 404.", "Sleep mode engaged."
    ]
}

senders = ["System", "User", "Bot"]


def get_random_message(sender):
    pool = message_pools[sender]
    return random.choice(pool)


def run(input_data, context):
    """
    Simulate a long session with multiple participants.
    
    This is a simplified version that doesn't require context.runCLM.
    It simulates the message flow and returns a mock result.
    """
    session_id = f"clm_long_session_{int(time.time() * 1000)}"
    
    # Config
    TOTAL_MESSAGES = 20
    
    transcript = []
    
    for i in range(TOTAL_MESSAGES):
        sender = random.choice(senders)
        msg = get_random_message(sender)
        
        transcript.append({
            "index": i,
            "sender": sender,
            "content": msg
        })
    
    # Build mock summary
    result = {
        "success": True,
        "session_id": session_id,
        "total_messages": len(transcript),
        "summary": {
            "type": "p2p_session_summary",
            "fullTranscript": transcript,
            "messageCount": len(transcript),
            "participants": list(set(t["sender"] for t in transcript))
        },
        "note": "Simulated long session (Python implementation)"
    }
    
    return result


# Entry point for PTR
result = run({}, {})

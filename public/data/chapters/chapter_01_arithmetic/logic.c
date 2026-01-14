#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Simple JSON parsing is hard in C without libraries.
// For this demo, we will manually parse simple {"a": X, "b": Y} strings 
// or just assume the input format is simple.
// To be robust, we'd use cJSON or similar.
// For this TDD step, let's do a very naive parser or just look for "a": and "b":

char* find_last(const char* haystack, const char* needle) {
    char* found = NULL;
    char* h = (char*)haystack;
    while ((h = strstr(h, needle))) {
        found = h;
        h++;
    }
    return found;
}

int get_int_from_json(const char* json, const char* key) {
    char search[32];
    sprintf(search, "\"%s\":", key);
    // Use find_last to get the value from the actual execution context (which is appended at end),
    // ignoring any earlier occurrences in the 'balanced' test history configuration.
    char* pos = find_last(json, search);
    if (!pos) return 0;
    return atoi(pos + strlen(search));
}

int main(int argc, char *argv[]) {
    // 1. Read Context from argv[1]
    char* context_str = (argc > 1) ? argv[1] : "{}";

    // 2. Perform Logic
    int a = get_int_from_json(context_str, "a");
    int b = get_int_from_json(context_str, "b");
    int sum = a + b;

    // 3. Output Result
    printf("%d", sum);
    return 0;
}

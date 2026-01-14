#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <ctype.h>

// Simple JSON parser helpers
double get_float_from_json(const char* json, const char* key) {
    char search[64];
    sprintf(search, "\"%s\":", key);
    char* pos = strstr(json, search);
    if (pos) {
        pos += strlen(search);
        // Skip whitespace
        while (*pos == ' ') pos++;
        return atof(pos);
    }
    return 0.0;
}

void get_string_from_json(const char* json, const char* key, char* buffer) {
    char search[64];
    sprintf(search, "\"%s\":", key);
    char* pos = strstr(json, search);
    if (pos) {
        pos += strlen(search);
        // Find start quote
        char* start = strchr(pos, '"');
        if (start) {
            start++;
            char* end = strchr(start, '"');
            if (end) {
                int len = end - start;
                strncpy(buffer, start, len);
                buffer[len] = '\0';
                return;
            }
        }
    }
    strcpy(buffer, "add");
}

// Helper to find next object in array
const char* next_object(const char* current) {
    const char* start = strchr(current, '{');
    if (!start) return NULL;
    // Simple bracket balance since we don't have nested objects
    const char* p = start;
    int balance = 0;
    while (*p) {
        if (*p == '{') balance++;
        if (*p == '}') balance--;
        if (balance == 0) return p + 1; // End of object
        p++;
    }
    return NULL;
}

int main(int argc, char* argv[]) {
    const char* context_str = (argc > 1) ? argv[1] : "{}";
    
    // Check for batch mode
    if (strstr(context_str, "\"batch\": true") || strstr(context_str, "\"batch\":true")) {
        printf("[");
        // Find examples array
        const char* examples_pos = strstr(context_str, "\"examples\":");
        if (examples_pos) {
            const char* p = strchr(examples_pos, '[');
            if (p) {
                int first = 1;
                while ((p = strchr(p, '{')) != NULL) {
                    // Extract object string manually to ensure isolation
                    const char* end = next_object(p);
                    if (!end) break;
                    
                    int len = end - p;
                    char* item_json = (char*)malloc(len + 1);
                    strncpy(item_json, p, len);
                    item_json[len] = '\0';
                    
                    char op[32];
                    get_string_from_json(item_json, "op", op);
                    double a = get_float_from_json(item_json, "a");
                    double b = get_float_from_json(item_json, "b");
                    
                    double res = 0.0;
                    if (strcmp(op, "add") == 0) res = a + b;
                    else if (strcmp(op, "mul") == 0) res = a * b;
                    else if (strcmp(op, "sin") == 0) res = sin(a);
                    else if (strcmp(op, "cos") == 0) res = cos(a);
                    
                    if (!first) printf(", ");
                    printf("%f", res);
                    first = 0;
                    
                    free(item_json);
                    p = end; // advance
                }
            }
        }
        printf("]");
        return 0;
    }

    // fallback to single
    char op[32];
    get_string_from_json(context_str, "op", op);
    double a = get_float_from_json(context_str, "a");
    double b = get_float_from_json(context_str, "b");
    
    double result = 0.0;
    
    if (strcmp(op, "add") == 0) {
        result = a + b;
    } else if (strcmp(op, "mul") == 0) {
        result = a * b;
    } else if (strcmp(op, "sin") == 0) {
        result = sin(a);
    } else if (strcmp(op, "cos") == 0) {
        result = cos(a);
    }
    
    printf("%f", result);
    return 0;
}

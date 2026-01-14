# Logic for R Runtime
# Supports add, mul, sin, cos
# No external dependencies (jsonlite) to ensure portability

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 1) {
  cat("Error: No context provided\n", file = stderr())
  quit(status = 1)
}

json_str <- args[1]

get_val <- function(json, key, type = "numeric") {
  # Looking for "key": value OR "key":value
  # Value can be number, string ("..."), or null
  pattern <- paste0('"', key, '"\\s*:\\s*([^,}]+)')
  match <- regexec(pattern, json)
  result <- regmatches(json, match)[[1]]

  if (length(result) < 2) {
    return(NULL)
  }

  val_str <- result[2]
  # Clean up quotes for strings
  val_str <- gsub('^"|"$', "", val_str)
  val_str <- trimws(val_str)

  if (type == "numeric") {
    if (val_str == "null") {
      return(0)
    } # Handle null as 0
    return(as.numeric(val_str))
  } else {
    return(val_str)
  }
}

# Check for batch mode
is_batch <- grepl('"batch"\\s*:\\s*true', json_str)

if (is_batch) {
  # Parse examples list manually
  # "examples": [ { ... }, { ... } ]

  # Find start of examples array
  ex_match <- regexpr('"examples"\\s*:\\s*\\[', json_str)
  if (ex_match == -1) {
    cat("[]")
    quit(status = 0)
  }

  # Extract content inside [...]
  start_pos <- ex_match + attr(ex_match, "match.length")
  content <- substring(json_str, start_pos)
  # Basic bracket matching or just take until end (assuming simple context)

  # Split by "},{" to separate objects
  # This is fragile but sufficient for controlled test inputs
  items <- strsplit(content, "\\},\\{")[[1]]

  results <- c()

  for (item in items) {
    # Ensure item has braces for regex to work
    if (!grepl("^\\{", item)) item <- paste0("{", item)
    if (!grepl("\\}$", item)) item <- paste0(item, "}")

    op <- get_val(item, "op", "string")
    a_val <- get_val(item, "a", "numeric")
    b_val <- get_val(item, "b", "numeric")

    if (is.null(a_val) || is.na(a_val)) a_val <- 0
    if (is.null(b_val) || is.na(b_val)) b_val <- 0

    res <- 0
    if (!is.null(op)) {
      if (op == "add") {
        res <- a_val + b_val
      } else if (op == "mul") {
        res <- a_val * b_val
      } else if (op == "sin") {
        res <- sin(a_val)
      } else if (op == "cos") res <- cos(a_val)
    }
    results <- c(results, res)
  }

  # Output JSON array
  cat("[")
  cat(paste(format(results, scientific = FALSE, digits = 15), collapse = ", "))
  cat("]")
} else {
  # Single mode
  op <- get_val(json_str, "op", "string")
  a <- get_val(json_str, "a", "numeric")
  b <- get_val(json_str, "b", "numeric")

  # Handle missing values safely
  if (is.null(a) || is.na(a)) a <- 0
  if (is.null(b) || is.na(b)) b <- 0

  result <- 0

  if (!is.null(op)) {
    if (op == "add") {
      result <- a + b
    } else if (op == "mul") {
      result <- a * b
    } else if (op == "sin") {
      result <- sin(a)
    } else if (op == "cos") {
      result <- cos(a)
    }
  }

  cat(format(result, scientific = FALSE, digits = 15))
}

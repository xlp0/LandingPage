-- import Lean removed to rely on prelude

-- Simple float parser for strings (very naive implementation)
-- Since Lean 4 lacks String.toFloat?, we manually parse components
def parseFloat (s : String) : Float :=
  if s.isEmpty then 0.0
  else
    -- Handle scientific notation by splitting on 'e'
    let eParts := s.toLower.splitOn "e"
    let mantissaStr := eParts.head!
    let exponentStr := eParts.getD 1 "0"

    let isNeg := mantissaStr.startsWith "-"
    let absMantissa := if isNeg then mantissaStr.drop 1 else mantissaStr

    let mantissa :=
      match absMantissa.toInt? with
      | some i => Float.ofInt i
      | none =>
        -- Try to handle decimal numbers by splitting on '.'
        let parts := absMantissa.splitOn "."
        match parts with
        | intPart :: decPart :: _ =>
          let iVal := intPart.toInt?.getD 0
          let dValStr := decPart
          let dVal := dValStr.toNat?.getD 0
          let dLen := dValStr.length
          -- Build: iVal + dVal / (10^dLen)
          let whole := Float.ofInt iVal
          let frac := (Float.ofNat dVal) / (Float.ofNat (10 ^ dLen))
          whole + frac
        | _ => 0.0

    let mantissaSigned := if isNeg then -mantissa else mantissa

    -- Parse exponent and apply it
    let exponent := exponentStr.toInt?.getD 0
    if exponent >= 0 then
      mantissaSigned * (Float.ofNat (10 ^ exponent.toNat))
    else
      mantissaSigned / (Float.ofNat (10 ^ exponent.natAbs))

-- Helper to parse float from JSON string (very naive)
def getFloatFromJson (json : String) (key : String) : Float :=
  let parts := json.splitOn ("\"" ++ key ++ "\":")
  if parts.length < 2 then 0.0
  else
    let rest := parts.getLast!
    let rest := rest.trimLeft
    -- take while numeric or dot or minus or e or plus
    let valStr := rest.takeWhile (fun c => c.isDigit || c == '.' || c == '-' || c == 'e' || c == '+')
    parseFloat valStr

-- Helper to parse string from JSON string
def getStringFromJson (json : String) (key : String) : String :=
  let parts := json.splitOn ("\"" ++ key ++ "\":")
  if parts.length < 2 then "add"
  else
    let rest := parts.getLast!
    let rest := rest.trimLeft
    if rest.startsWith "\"" then
       let content := rest.drop 1
       let valStr := content.takeWhile (fun c => c != '"')
       valStr
    else "add"

def main (args : List String) : IO Unit := do
  let contextStr := match args with
    | [] => "{}"
    | (x :: _) => x

  -- Check for batch vs single
  -- Naive substring check: splitOn, if length > 1 then it contains the separator
  let hasBatchSpace := (contextStr.splitOn "\"batch\": true").length > 1
  let hasBatchNoSpace := (contextStr.splitOn "\"batch\":true").length > 1

  if hasBatchSpace || hasBatchNoSpace then
    -- Very naive manual list parsing: split by "},{" to find objects
    -- "examples": [ { ... }, { ... } ]
    let parts := contextStr.splitOn "examples"
    match parts with
    | _ :: rest :: _ =>
        let content := rest.trimLeft
        -- approximate start/end of array
        let rawArr := content.dropWhile (fun c => c != '[') |>.drop 1
        -- split using regex-like approximation (assumes flat structure)
        let items := rawArr.splitOn "}"

        let mut results : List Float := []
        for item in items do
           -- logic check: if item contains "op"
           if (item.splitOn "\"op\"").length > 1 then
             let workingJson := item ++ "}" -- reconstruct validish json for helpers
             let op := getStringFromJson workingJson "op"
             let a := getFloatFromJson workingJson "a"
             let b := getFloatFromJson workingJson "b"
             let res := match op with
              | "add" => a + b
              | "mul" => a * b
              | "sin" => Float.sin a
              | "cos" => Float.cos a
              | _ => 0.0
             results := results ++ [res]

        -- Print JSON array manually
        IO.print "["
        let mut first := true
        for r in results do
          if !first then IO.print ", "
          IO.print s!"{r}"
          first := false
        IO.print "]"
    | _ => IO.print "[]"
  else
    let op := getStringFromJson contextStr "op"
    let a := getFloatFromJson contextStr "a"
    let b := getFloatFromJson contextStr "b"

    let result : Float := match op with
      | "add" => a + b
      | "mul" => a * b
      | "sin" => Float.sin a
      | "cos" => Float.cos a
      | _ => 0.0

    IO.print s!"{result}"

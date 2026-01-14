-- Lean 4 Propositional Logic
-- Demonstrates boolean operations and logical connectives

-- JSON parser that handles spaces after colons
def getStringFromJson (json : String) (key : String) : String :=
  let pattern1 := "\"" ++ key ++ "\":"
  let pattern2 := "\"" ++ key ++ "\": "
  let parts :=
    let p1 := json.splitOn pattern2
    if p1.length > 1 then p1
    else json.splitOn pattern1
  match parts with
  | _ :: rest :: _ =>
    let rest := rest.trimLeft
    if rest.startsWith "\"" then
       let content := rest.drop 1
       content.takeWhile (fun c => c != '"')
    else
       rest.takeWhile (fun c => c != ',' && c != '}' && c != ' ')
  | _ => ""

def getBoolFromJson (json : String) (key : String) : Bool :=
  let valStr := getStringFromJson json key
  valStr == "true"

def main (args : List String) : IO Unit := do
  let contextStr := match args with
    | [] => "{}"
    | (x :: _) => x

  let op := getStringFromJson contextStr "op"
  let p := getBoolFromJson contextStr "p"
  let q := getBoolFromJson contextStr "q"

  let result : Bool := match op with
    | "and" => p && q
    | "or" => p || q
    | "not" => !p
    | "implies" => !p || q  -- P → Q ≡ ¬P ∨ Q
    | "xor" => (p && !q) || (!p && q)
    | "nand" => !(p && q)
    | "nor" => !(p || q)
    | "iff" => (p && q) || (!p && !q)  -- P ↔ Q ≡ (P ∧ Q) ∨ (¬P ∧ ¬Q)
    | _ => false

  IO.print s!"{result}"

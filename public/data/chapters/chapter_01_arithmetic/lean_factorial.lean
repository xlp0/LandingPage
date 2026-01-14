-- Lean 4 Factorial Logic
-- Demonstrates recursive functions with termination proofs

def factorial : Nat → Nat
  | 0 => 1
  | n + 1 => (n + 1) * factorial n

-- JSON parser that handles spaces after colons
def getNatFromJson (json : String) (key : String) : Nat :=
  -- Try both with and without space after colon
  let pattern1 := "\"" ++ key ++ "\":"
  let pattern2 := "\"" ++ key ++ "\": "
  let parts :=
    let p1 := json.splitOn pattern2
    if p1.length > 1 then p1
    else json.splitOn pattern1
  match parts with
  | _ :: rest :: _ =>
    let rest := rest.trimLeft
    let valStr := rest.takeWhile (fun c => c.isDigit)
    valStr.toNat!
  | _ => 0

def main (args : List String) : IO Unit := do
  let contextStr := match args with
    | [] => "{}"
    | (x :: _) => x

  let n := getNatFromJson contextStr "n"
  let result := factorial n

  IO.print s!"{result}"

-- Lean 4 Multiplication Logic
-- Demonstrates basic arithmetic with type safety

-- JSON parser that handles spaces after colons
def getIntFromJson (json : String) (key : String) : Int :=
  let pattern1 := "\"" ++ key ++ "\":"
  let pattern2 := "\"" ++ key ++ "\": "
  let parts :=
    let p1 := json.splitOn pattern2
    if p1.length > 1 then p1
    else json.splitOn pattern1
  match parts with
  | _ :: rest :: _ =>
    let rest := rest.trimLeft
    let valStr := rest.takeWhile (fun c => c.isDigit || c == '-')
    valStr.toInt!
  | _ => 0

def main (args : List String) : IO Unit := do
  let contextStr := match args with
    | [] => "{}"
    | (x :: _) => x

  let a := getIntFromJson contextStr "a"
  let b := getIntFromJson contextStr "b"
  let product := a * b

  IO.print s!"{product}"

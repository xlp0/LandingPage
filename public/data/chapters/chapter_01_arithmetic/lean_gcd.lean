-- Lean 4 GCD (Euclidean Algorithm)
-- Demonstrates recursion with explicit termination proof

def gcd (a b : Nat) : Nat :=
  if h : b = 0 then a
  else
    have : a % b < b := Nat.mod_lt a (Nat.pos_of_ne_zero h)
    gcd b (a % b)
termination_by b

-- JSON parser that handles spaces after colons
def getNatFromJson (json : String) (key : String) : Nat :=
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

  let a := getNatFromJson contextStr "a"
  let b := getNatFromJson contextStr "b"
  let result := gcd a b

  IO.print s!"{result}"

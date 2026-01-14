-- Lean 4 Primality Test
-- Simple trial division using partial recursion

partial def hasDivisor (n : Nat) (d : Nat) : Bool :=
  if d * d > n then false
  else if n % d = 0 then true
  else hasDivisor n (d + 1)

def isPrime (n : Nat) : Bool :=
  if n < 2 then false
  else hasDivisor n 2 |> not

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

  let n := getNatFromJson contextStr "n"
  let result := isPrime n

  IO.print s!"{result}"

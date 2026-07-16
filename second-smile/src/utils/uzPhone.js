export function extractUzLocalDigits(input) {
  const digits = String(input || "").replace(/\D/g, "");

  // If user pastes full number like 998901234567 or +998901234567
  if (digits.startsWith("998")) {
    return digits.slice(3, 12);
  }

  // Otherwise treat as local digits and keep last 9 (so pastes like 90901234567 still work)
  return digits.slice(-9);
}

export function toUzPhone(localDigits) {
  const d = extractUzLocalDigits(localDigits);
  return d ? `+998${d}` : "";
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

export async function isCronAuthorized(
  providedSecret: string | null,
  expectedSecret: string,
) {
  if (!providedSecret || !expectedSecret) return false;

  const [providedHash, expectedHash] = await Promise.all([
    digest(providedSecret),
    digest(expectedSecret),
  ]);
  let difference = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    difference |= providedHash[index] ^ expectedHash[index];
  }
  return difference === 0;
}

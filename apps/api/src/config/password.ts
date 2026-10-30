import bcrypt from "bcryptjs";

export const BCRYPT_COST = 10;

// Precomputed at module load: a hash of a random string at BCRYPT_COST.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "dummy-password-for-timing-equalization",
  BCRYPT_COST
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

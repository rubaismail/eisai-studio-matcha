// Must match the API responses for /api/auth/*.
export type UserRole = 'customer' | 'admin';

export interface AuthUser {
  _id: string;
  email: string;
  role: UserRole;
}

// POST /api/auth/login
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

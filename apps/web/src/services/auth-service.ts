import { apiRequest } from "@/lib/api-client";
import {
  mapUserFromApi,
  type AuthUser,
  type LoginCredentials,
  type RegisterCredentials,
  type TokenResponse,
  type UserApiResponse,
} from "@/types/auth";

export async function login(
  credentials: LoginCredentials,
): Promise<{ token: string; user?: AuthUser }> {
  const tokenRes = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: credentials,
  });
  return { token: tokenRes.access_token };
}

export async function register(credentials: RegisterCredentials): Promise<AuthUser> {
  const user = await apiRequest<UserApiResponse>("/auth/register", {
    method: "POST",
    body: {
      email: credentials.email,
      password: credentials.password,
      full_name: credentials.fullName ?? null,
    },
  });
  return mapUserFromApi(user);
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const user = await apiRequest<UserApiResponse>("/auth/me", {
    method: "GET",
    token,
  });
  return mapUserFromApi(user);
}

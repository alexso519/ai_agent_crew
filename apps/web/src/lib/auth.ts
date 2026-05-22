export const AUTH_COOKIE = "crewcc_token";
export const AUTH_STORAGE_KEY = "crewcc_auth";

export const ROLE_PERMISSIONS = {
  admin: ["read", "write", "execute", "approve", "admin"],
  operator: ["read", "write", "execute"],
  reviewer: ["read", "approve"],
  viewer: ["read"],
} as const;

export type Permission = (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number];

export function hasPermission(
  role: keyof typeof ROLE_PERMISSIONS,
  permission: Permission,
): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export function setAuthCookie(token: string): void {
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

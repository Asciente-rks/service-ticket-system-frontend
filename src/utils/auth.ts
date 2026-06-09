import { jwtDecode } from "jwt-decode";
import type { User } from "../types";

interface DecodedToken extends User {
  exp?: number;
  iat?: number;
}

export const getToken = (): string | null => localStorage.getItem("token");

export const setToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const getLoggedInUser = (): User | null => {
  const token = getToken();
  if (!token) return null;
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

export const hasOrganization = (): boolean => {
  const user = getLoggedInUser();
  return !!(user && user.organizationId);
};

export const logout = (): void => {
  const theme = sessionStorage.getItem("theme") || localStorage.getItem("theme");
  localStorage.clear();
  if (theme) {
    localStorage.setItem("theme", theme);
    sessionStorage.setItem("theme", theme);
  }
  window.location.href = "/login";
};

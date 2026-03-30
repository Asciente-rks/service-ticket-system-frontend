import { jwtDecode } from "jwt-decode";
import type { User } from "../types";

export const getLoggedInUser = (): User | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode<User>(token);
  } catch {
    return null;
  }
};

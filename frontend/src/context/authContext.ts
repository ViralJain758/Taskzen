import { createContext } from "react";
import type { User } from "../types/user";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

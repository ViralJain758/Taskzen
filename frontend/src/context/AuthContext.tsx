import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";
import type { User } from "../types/user";
import { setAuthToken } from "../services/api";
import { syncSocketAuth } from "../sockets/socket";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser) as User;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  useEffect(() => {
    setAuthToken(token);
    syncSocketAuth(token);

    if (token) {
      localStorage.setItem("token", token);
      return;
    }

    localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      return;
    }

    localStorage.removeItem("user");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

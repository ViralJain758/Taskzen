import { useState, useContext } from "react";
import axios from "axios";
import api, { setAuthToken } from "../services/api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context.ts";
import type { ApiErrorResponse } from "../types/api.ts";

function Login() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/auth/login", form);

      const { token, user } = res.data;

      auth?.setUser(user);
      auth?.setToken(token);

      setAuthToken(token);

      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        alert(error.response?.data?.message || "Error");
        return;
      }

      alert("Error");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="p-6 bg-white shadow rounded w-80"
      >
        <h2 className="text-xl mb-4">Login</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="w-full mb-2 p-2 border"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full mb-2 p-2 border"
          onChange={handleChange}
        />

        <button className="w-full bg-indigo-500 text-white p-2">Login</button>
      </form>
    </div>
  );
}

export default Login;

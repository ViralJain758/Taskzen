import { useState, useContext } from "react";
import axios from "axios";
import api, { setAuthToken } from "../services/api";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context.ts";
import type { ApiErrorResponse } from "../types/api.ts";
import toast from "react-hot-toast";

function Login() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/login", form);

      const { token, user } = res.data;

      auth?.setUser(user);
      auth?.setToken(token);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setAuthToken(token);
      toast.success("Login successful");

      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        toast.error(error.response?.data?.message || "Invalid credentials");
        return;
      }

      toast.error("Something went wrong while logging in");
    } finally {
      setIsSubmitting(false);
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-indigo-500 p-2 text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default Login;

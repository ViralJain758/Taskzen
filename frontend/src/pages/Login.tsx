import { useState, useContext } from "react";
import axios from "axios";
import api, { setAuthToken } from "../services/api";
import { Link, useNavigate } from "react-router-dom";
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

      navigate("/dashboard");
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
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="surface-card fade-up w-full max-w-md rounded-2xl p-6 md:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
          Welcome back
        </p>
        <h2 className="mb-1 mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Sign in
        </h2>
        <p className="mb-6 text-sm text-slate-500">
          Continue to your workspaces and active projects.
        </p>

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          New here?{" "}
          <Link
            to="/register"
            className="font-semibold text-sky-700 transition hover:text-sky-800"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;

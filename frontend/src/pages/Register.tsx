import { useContext, useEffect, useState } from "react";
import axios from "axios";
import api, { setAuthToken } from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import type { ApiErrorResponse } from "../types/api.ts";
import toast from "react-hot-toast";
import { AuthContext } from "../context/auth-context.ts";
import { getApiErrorMessage } from "../utils/apiError";

function Register() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth?.token) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth?.token, navigate]);

  const [form, setForm] = useState({
    name: "",
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
      const res = await api.post("/auth/register", form);

      const { token, user } = res.data;

      auth?.setUser(user);
      auth?.setToken(token);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setAuthToken(token);
      toast.success("Registration successful");
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        toast.error(getApiErrorMessage(error, "Registration failed"));
        return;
      }

      toast.error("Something went wrong while registering");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="surface-card fade-up w-full max-w-md rounded-2xl p-4 sm:p-6 md:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
          Get started
        </p>
        <h2 className="mb-1 mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Create account
        </h2>
        <p className="mb-4 text-xs text-slate-500 sm:mb-6 sm:text-sm">
          Build your team workspace and ship tasks faster.
        </p>

        <input
          type="text"
          name="name"
          placeholder="Name"
          className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:mb-3 sm:py-2.5 sm:text-sm"
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:mb-3 sm:py-2.5 sm:text-sm"
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:mb-4 sm:py-2.5 sm:text-sm"
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {isSubmitting ? "Creating account..." : "Register"}
        </button>

        <p className="mt-3 text-center text-xs text-slate-600 sm:mt-4 sm:text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-orange-700 transition hover:text-orange-800"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;

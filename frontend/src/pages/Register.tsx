import { useState } from "react";
import axios from "axios";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import type { ApiErrorResponse } from "../types/api.ts";

function Register() {
  const navigate = useNavigate();

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

    try {
      await api.post("/auth/register", form);
      alert("Registered successfully");
      navigate("/login");
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
        <h2 className="text-xl mb-4">Register</h2>

        <input
          type="text"
          name="name"
          placeholder="Name"
          className="w-full mb-2 p-2 border"
          onChange={handleChange}
        />

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

        <button className="w-full bg-indigo-500 text-white p-2">
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;

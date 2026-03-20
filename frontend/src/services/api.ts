import axios from "axios";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../utils/apiError";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

const savedToken = localStorage.getItem("token");
if (savedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getApiErrorMessage(
      error,
      "Request failed. Please try again.",
    );
    toast.error(message);
    return Promise.reject(error);
  },
);

export default api;

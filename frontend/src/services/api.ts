import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
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

const getErrorMessage = (error: unknown): string => {
  if (typeof error !== "object" || error === null) {
    return "An unexpected error occurred.";
  }

  const axiosLikeError = error as {
    response?: { data?: { message?: string }; status?: number };
    message?: string;
  };

  if (!axiosLikeError.response) {
    return "Network error. Please check your connection and try again.";
  }

  return (
    axiosLikeError.response.data?.message ||
    axiosLikeError.message ||
    "Request failed. Please try again."
  );
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error);
    toast.error(message);
    return Promise.reject(error);
  },
);

export default api;

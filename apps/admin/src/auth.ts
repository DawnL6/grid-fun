import { defineStore } from "pinia";
import { ref } from "vue";
import { api, setAccessToken, type Admin, type LoginResult } from "./api";

export const useAuthStore = defineStore("admin-auth", () => {
  const admin = ref<Admin | null>(null);
  const expiresAt = ref(0);
  const authenticated = () =>
    admin.value !== null && Date.now() < expiresAt.value;

  async function login(username: string, password: string) {
    const response = await api.post<LoginResult>("/admin/auth/login", {
      username,
      password,
    });
    setAccessToken(response.data.token);
    admin.value = response.data.admin;
    expiresAt.value = response.data.expiresAt;
  }

  async function logout() {
    try {
      if (admin.value) await api.post("/admin/auth/logout");
    } finally {
      clear();
    }
  }

  function clear() {
    setAccessToken("");
    admin.value = null;
    expiresAt.value = 0;
  }

  return { admin, authenticated, login, logout, clear };
});

import axios from "axios";

export type Admin = { id: string; username: string };
export type LoginResult = { token: string; expiresAt: number; admin: Admin };

export const api = axios.create({ baseURL: "/api/v1", timeout: 10000 });
let accessToken = "";
let onUnauthorized: (() => void) | undefined;
export function setAccessToken(token: string) {
  accessToken = token;
}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
api.interceptors.response.use(undefined, (error) => {
  if (
    error.response?.status === 401 &&
    !error.config?.url?.endsWith("/admin/auth/login")
  )
    onUnauthorized?.();
  return Promise.reject(error);
});

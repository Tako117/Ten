/**
 * API Base URL configuration.
 * In local dev (vite proxy), this is empty so relative paths like /api/... work.
 * In production (Render), VITE_API_BASE_URL is set to the backend URL.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

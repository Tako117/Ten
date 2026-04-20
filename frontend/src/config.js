/**
 * API Base URL configuration.
 * Dynamically switches between localhost and production Render domains.
 */
export const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://ten-backend-k7kv.onrender.com';

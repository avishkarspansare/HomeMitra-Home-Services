// ============================================================
// HomeMitra – Runtime Environment Config
//
// On Render: set the BACKEND_URL environment variable.
// Render's static site feature can inject it via a rewrite rule,
// OR you simply deploy this file with the correct URL baked in
// via Render's build environment substitution (see README).
//
// HOW TO SET on Render (Frontend static service):
//   Environment variable:  BACKEND_URL = https://homemitra-backend.onrender.com
//   Build command:
//     sed -i "s|__BACKEND_URL__|$BACKEND_URL|g" frontend/js/env-config.js
// ============================================================

window.API_BASE_URL = '__BACKEND_URL__';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export function getToken() {
  return window.sessionStorage.getItem('neefl_token') || window.localStorage.getItem('neefl_token');
}

export function getTokenPayload() {
  const token = getToken();
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  try {
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}

export function getUserRole() {
  const payload = getTokenPayload();
  return payload?.role || null;
}

export function getUserId() {
  const payload = getTokenPayload();
  return payload?.sub || null;
}

export function setToken(token) {
  const persist =
    typeof arguments[1] === 'boolean'
      ? arguments[1]
      : typeof arguments[1] === 'object' && arguments[1] !== null
        ? arguments[1].persist !== false
        : true;

  if (persist) {
    window.localStorage.setItem('neefl_token', token);
    window.sessionStorage.removeItem('neefl_token');
    return;
  }

  window.sessionStorage.setItem('neefl_token', token);
  window.localStorage.removeItem('neefl_token');
}

export function clearToken() {
  window.localStorage.removeItem('neefl_token');
  window.sessionStorage.removeItem('neefl_token');
}

function parseResponseText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function api(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true
  } = options;

  const requestHeaders = { ...headers };
  const token = auth ? getToken() : null;
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const config = { method, headers: requestHeaders };

  if (body !== undefined) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
      config.headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(API_BASE ? `${API_BASE}${path}` : path, config);
  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    const message = data?.error || response.statusText || 'request_failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function healthCheck() {
  const response = await fetch(API_BASE ? `${API_BASE}/health` : '/health');
  const text = await response.text();
  return parseResponseText(text);
}

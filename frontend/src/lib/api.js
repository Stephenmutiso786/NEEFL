const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export function getToken() {
  return window.localStorage.getItem('neefl_token');
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
  } catch (err) {
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
  window.localStorage.setItem('neefl_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('neefl_token');
}

function parseResponseText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
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

  const response = await fetch(`${API_BASE}${path}`, config);
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
  const response = await fetch(`${API_BASE}/health`);
  const text = await response.text();
  return parseResponseText(text);
}

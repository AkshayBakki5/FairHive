/**
 * FairHive API client – base URL, token, get/post/patch/delete helpers.
 */
(function (global) {
  const BASE_URL = (function () {
    if (typeof window !== 'undefined' && window.FAIRHIVE_API_URL) return window.FAIRHIVE_API_URL;
    return 'http://localhost:3000/api';
  })();

  function getToken() {
    try {
      return localStorage.getItem('fairhive_token') || null;
    } catch (_) {
      return null;
    }
  }

  function getHeaders(includeAuth) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (includeAuth !== false && token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  function handleResponse(res) {
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    if (!res.ok) {
      const err = new Error(res.statusText || 'Request failed');
      err.status = res.status;
      return isJson ? res.json().then(body => { err.body = body; throw err; }) : Promise.reject(err);
    }
    return isJson ? res.json() : res.text();
  }

  const api = {
    getToken,
    get baseURL() { return BASE_URL; },
    get(url, opts) {
      return fetch(BASE_URL + url, { method: 'GET', headers: getHeaders(opts && opts.noAuth), ...opts }).then(handleResponse);
    },
    post(url, body, opts) {
      return fetch(BASE_URL + url, {
        method: 'POST',
        headers: getHeaders(opts && opts.noAuth),
        body: body != null ? JSON.stringify(body) : undefined,
        ...opts,
      }).then(handleResponse);
    },
    patch(url, body, opts) {
      return fetch(BASE_URL + url, {
        method: 'PATCH',
        headers: getHeaders(opts && opts.noAuth),
        body: body != null ? JSON.stringify(body) : undefined,
        ...opts,
      }).then(handleResponse);
    },
    delete(url, opts) {
      return fetch(BASE_URL + url, { method: 'DELETE', headers: getHeaders(opts && opts.noAuth), ...opts }).then(handleResponse);
    },
  };

  global.FairHiveAPI = api;
})(typeof window !== 'undefined' ? window : this);

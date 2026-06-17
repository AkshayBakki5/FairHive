/**
 * FairHive auth – login, register, logout, guard (redirect if not logged in).
 */
(function (global) {
  const TOKEN_KEY = 'fairhive_token';
  const USER_KEY = 'fairhive_user';
  const ROOM_KEY = 'fairhive_room';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch (_) {
      return null;
    }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROOM_KEY);
  }

  function getCurrentRoom() {
    try {
      const raw = localStorage.getItem(ROOM_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setCurrentRoom(room) {
    if (room) localStorage.setItem(ROOM_KEY, JSON.stringify(room));
    else localStorage.removeItem(ROOM_KEY);
  }

  /**
   * Redirect to login if no token. Call on protected pages.
   */
  function guard() {
    if (!getToken()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  /**
   * Redirect to dashboard if already logged in. Call on login/register.
   */
  function redirectIfLoggedIn() {
    if (getToken()) {
      window.location.href = '/frontend/dashboard.html';
      return true;
    }
    return false;
  }

  global.FairHiveAuth = {
    getToken,
    getUser,
    setSession,
    clearSession,
    getCurrentRoom,
    setCurrentRoom,
    guard,
    redirectIfLoggedIn,
  };
})(typeof window !== 'undefined' ? window : this);

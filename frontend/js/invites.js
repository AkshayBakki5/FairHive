/**
 * FairHive invite handling – check URL hash for invite tokens and accept them
 */
(function (global) {
  const INVITE_TOKEN_KEY = 'fairhive_pending_invite';

  function getInviteTokenFromHash() {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash || '';
    const match = hash.match(/invite=([^&]+)/);
    return match ? match[1] : null;
  }

  function storePendingInvite(token) {
    try {
      localStorage.setItem(INVITE_TOKEN_KEY, token);
    } catch (_) {
      // Ignore
    }
  }

  function getPendingInvite() {
    try {
      return localStorage.getItem(INVITE_TOKEN_KEY);
    } catch (_) {
      return null;
    }
  }

  function clearPendingInvite() {
    try {
      localStorage.removeItem(INVITE_TOKEN_KEY);
    } catch (_) {
      // Ignore
    }
  }

  /**
   * Accept an invite token
   * @param {string} token - Invite token
   * @returns {Promise<Object>} Room info
   */
  function acceptInvite(token) {
    if (!token) return Promise.reject(new Error('No token provided'));
    if (typeof FairHiveAPI === 'undefined') {
      return Promise.reject(new Error('FairHiveAPI not available'));
    }

    return FairHiveAPI.post('/invites/accept', { token: token }).then(function (data) {
      clearPendingInvite();
      // Clear hash
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      return data;
    });
  }

  /**
   * Check for invite token and handle it
   * Call this on app load if user is authenticated
   */
  function checkAndAcceptInvite() {
    if (typeof FairHiveAuth === 'undefined' || !FairHiveAuth.getToken()) {
      return Promise.resolve(null);
    }

    const token = getInviteTokenFromHash() || getPendingInvite();
    if (!token) return Promise.resolve(null);

    return acceptInvite(token).then(function (data) {
      if (data && data.room) {
        // Set as current room
        if (typeof FairHiveAuth !== 'undefined' && FairHiveAuth.setCurrentRoom) {
          FairHiveAuth.setCurrentRoom(data.room);
        }
        // Redirect to members page or dashboard
        if (typeof window !== 'undefined') {
          window.location.href = 'members.html';
        }
      }
      return data;
    }).catch(function (err) {
      console.error('Failed to accept invite:', err);
      // Show error but don't block navigation
      if (typeof window !== 'undefined' && window.alert) {
        const msg = (err.body && err.body.error) || 'Failed to accept invitation';
        alert(msg);
      }
      clearPendingInvite();
      return null;
    });
  }

  /**
   * Store invite token if found in hash (for unauthenticated users)
   * Call this on login/register pages
   */
  function storeInviteFromHash() {
    const token = getInviteTokenFromHash();
    if (token) {
      storePendingInvite(token);
      // Clear hash
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }

  /**
   * Check for pending invite after login/register and accept it
   * Call this after successful authentication
   */
  function handlePendingInviteAfterAuth() {
    const token = getPendingInvite();
    if (!token) return Promise.resolve(null);

    return acceptInvite(token).then(function (data) {
      if (data && data.room) {
        if (typeof FairHiveAuth !== 'undefined' && FairHiveAuth.setCurrentRoom) {
          FairHiveAuth.setCurrentRoom(data.room);
        }
        if (typeof window !== 'undefined') {
          window.location.href = 'members.html';
          return true; // Indicates redirect happened
        }
      }
      return false;
    }).catch(function (err) {
      console.error('Failed to accept pending invite:', err);
      clearPendingInvite();
      return false;
    });
  }

  global.FairHiveInvites = {
    getInviteTokenFromHash,
    storePendingInvite,
    getPendingInvite,
    clearPendingInvite,
    acceptInvite,
    checkAndAcceptInvite,
    storeInviteFromHash,
    handlePendingInviteAfterAuth,
  };
})(typeof window !== 'undefined' ? window : this);

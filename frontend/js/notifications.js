(function (global) {
  var initialized = false;

  function setupNotifications() {
    if (initialized) return true;
    if (typeof FairHiveAuth === 'undefined') return false;
    if (!FairHiveAuth.getToken()) return false;

    var bell = document.getElementById('notificationsBell');
    var dropdown = document.getElementById('notificationsDropdown');
    var badge = document.getElementById('notificationsBadge');
    var listEl = document.getElementById('notificationsList');
    var emptyEl = document.getElementById('notificationsEmpty');

    // Navbar may not be rendered yet
    if (!bell || !dropdown) return false;

    function formatTime(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleString();
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function loadNotifications() {
      FairHiveAPI.get('/notifications').then(function (items) {
        items = items || [];
        var unread = items.filter(function (n) { return !n.is_read; }).length;
        if (badge) {
          if (unread > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = unread > 9 ? '9+' : unread;
          } else {
            badge.style.display = 'none';
          }
        }

        if (!listEl || !emptyEl) return;
        if (items.length === 0) {
          listEl.innerHTML = '';
          emptyEl.style.display = 'block';
          return;
        }
        emptyEl.style.display = 'none';

        var topFive = items.slice(0, 5);
        listEl.innerHTML = topFive.map(function (n) {
          var cls = 'notification-item' + (n.is_read ? '' : ' unread');
          var typeLabel = n.type || 'info';
          return '' +
            '<div class=\"' + cls + '\" data-id=\"' + n.id + '\">' +
              '<div class=\"notification-title\">' + escapeHtml(n.title || '') + '</div>' +
              '<div class=\"notification-message\">' + escapeHtml(n.message || '') + '</div>' +
              '<div class=\"notification-meta\">' +
                '<span class=\"badge badge-neutral\">' + escapeHtml(typeLabel) + '</span>' +
                '<span class=\"notification-time\">' + formatTime(n.createdAt) + '</span>' +
              '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('.notification-item').forEach(function (el) {
          el.addEventListener('click', function () {
            var id = el.getAttribute('data-id');
            FairHiveAPI.patch('/notifications/' + id + '/read', {}).then(function () {
              el.classList.remove('unread');
              loadNotifications();
            }).catch(function () {});
          });
        });
      }).catch(function () {});
    }

    function toggleDropdown() {
      var isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) {
        loadNotifications();
      }
    }

    bell.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });
    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target) && e.target !== bell) {
        dropdown.style.display = 'none';
      }
    });

    // Initial fetch
    loadNotifications();
    // Poll occasionally for changes
    setInterval(loadNotifications, 30000);

    initialized = true;
    return true;
  }

  function init() {
    if (!setupNotifications()) {
      // Navbar may not yet be injected; try once more shortly
      setTimeout(setupNotifications, 100);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  global.FairHiveNotifications = {
    init: init,
  };
})(typeof window !== 'undefined' ? window : this);



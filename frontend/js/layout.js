/**
 * Shared layout: sidebar + navbar. Call initLayout() after DOM ready.
 * Expects #sidebar-placeholder and #navbar-placeholder (or single #app-layout with sidebar + main).
 */
(function (global) {
  var currentPage = '';
  function getCurrentPage() {
    var path = (window.location.pathname || '').split('/').pop() || '';
    var name = path.replace('.html', '') || 'dashboard';
    return name;
  }

  var navItems = [
    { path: 'dashboard.html', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: 'expenses.html', label: 'Expenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: 'chores.html', label: 'Chores', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { path: 'members.html', label: 'Members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: 'analytics.html', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: 'admin.html', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { path: 'settings.html', label: 'Settings', icon: 'M11.983 4.5a2.5 2.5 0 014.834 0l.149.596a1.5 1.5 0 001.02 1.06l.57.176a2.5 2.5 0 011.59 3.218l-.21.57a1.5 1.5 0 000 .999l.21.57a2.5 2.5 0 01-1.59 3.218l-.57.176a1.5 1.5 0 00-1.02 1.06l-.149.596a2.5 2.5 0 01-4.834 0l-.149-.596a1.5 1.5 0 00-1.02-1.06l-.57-.176a2.5 2.5 0 01-1.59-3.218l.21-.57a1.5 1.5 0 000-.999l-.21-.57a2.5 2.5 0 011.59-3.218l.57-.176a1.5 1.5 0 001.02-1.06l.149-.596z M15 10.5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z' },
  ];

  function renderSidebar() {
    currentPage = getCurrentPage();
    var items = navItems.map(function (item) {
      var active = currentPage === item.path.replace('.html', '') ? ' active' : '';
      return '<a href="' + item.path + '" class="nav-link' + active + '">' +
        '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' + item.icon + '"/></svg>' +
        '<span>' + item.label + '</span></a>';
    }).join('');
    return '<aside class="sidebar" id="sidebar">' +
      '<nav class="sidebar-nav">' + items + '</nav>' +
      '</aside>' +
      '<div class="sidebar-overlay" id="sidebarOverlay"></div>';
  }

  function renderNavbar() {
    var user = (typeof FairHiveAuth !== 'undefined' && FairHiveAuth.getUser()) || {};
    var room = (typeof FairHiveAuth !== 'undefined' && FairHiveAuth.getCurrentRoom()) || null;
    var roomLabel = room ? room.name + ' (' + room.code + ')' : 'No room selected';
    var displayName = user.displayName || user.email || '';
    var initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
    return '<div class="navbar">' +
      '<button type="button" class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu">' +
      '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>' +
      '<span class="navbar-brand">FairHive</span>' +
      '<div class="navbar-actions">' +
        '<span style="font-size: var(--font-size-sm); color: var(--text-muted); margin-right: 0.75rem;" id="roomLabel">' + roomLabel + '</span>' +
        '<button type="button" class="icon-button" id="notificationsBell" aria-label="Notifications">' +
          '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>' +
          '<span class="badge badge-danger" id="notificationsBadge" style="display:none;">0</span>' +
        '</button>' +
        '<div class="notifications-dropdown" id="notificationsDropdown" style="display:none;">' +
          '<div class="notifications-header">Notifications</div>' +
          '<div id="notificationsList" class="notifications-list"></div>' +
          '<div class="notifications-empty" id="notificationsEmpty" style="display:none;">No notifications yet.</div>' +
        '</div>' +
        '<div class="profile-menu-wrapper">' +
          '<button type="button" class="profile-avatar" id="profileMenuButton" aria-label="Profile"><span id="profileInitial">' + initial + '</span></button>' +
          '<div class="profile-dropdown" id="profileDropdown" style="display:none;">' +
            '<div class="profile-info">' +
              '<div class="profile-name" id="profileName">' + displayName + '</div>' +
              '<div class="profile-email" id="profileEmail">' + (user.email || '') + '</div>' +
            '</div>' +
            '<div class="profile-menu-items">' +
              '<a href="#" class="profile-menu-item" id="profileSettings">Settings</a>' +
              '<button type="button" class="profile-menu-item profile-logout" id="logoutBtn">Logout</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  function initLayout() {
    var sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    var navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = renderSidebar();
    if (navbarPlaceholder) navbarPlaceholder.innerHTML = renderNavbar();

    document.querySelectorAll('.sidebar-nav a').forEach(function (a) {
      a.classList.remove('active');
      if ((a.getAttribute('href') || '').replace('.html', '') === getCurrentPage()) a.classList.add('active');
    });

    var toggle = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (toggle && sidebar) {
      toggle.addEventListener('click', function () {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show', sidebar.classList.contains('open'));
      });
    }
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (sidebar) sidebar.classList.remove('open');
        overlay.classList.remove('show');
      });
    }

    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof FairHiveAuth !== 'undefined') FairHiveAuth.clearSession();
        window.location.href = 'login.html';
      });
    }

    // Profile menu toggle
    var profileBtn = document.getElementById('profileMenuButton');
    var profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', function () {
        var isOpen = profileDropdown.style.display === 'block';
        profileDropdown.style.display = isOpen ? 'none' : 'block';
      });
      document.addEventListener('click', function (e) {
        if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
          profileDropdown.style.display = 'none';
        }
      });
    }
  }

  global.FairHiveLayout = {
    initLayout: initLayout,
    getCurrentPage: getCurrentPage,
    navItems: navItems,
  };
})(typeof window !== 'undefined' ? window : this);

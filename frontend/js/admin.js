/**
 * Admin panel – list all rooms and users
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var user         = FairHiveAuth.getUser();
  var forbidden    = document.getElementById('forbidden');
  var adminContent = document.getElementById('admin-content');
  var loading      = document.getElementById('loading');

  if (user && user.role !== 'admin') {
    loading.style.display  = 'none';
    forbidden.style.display = 'block';
    return;
  }

  Promise.all([
    FairHiveAPI.get('/admin/rooms'),
    FairHiveAPI.get('/admin/users'),
  ]).then(function (results) {
    loading.style.display  = 'none';
    adminContent.style.display = 'block';
    var rooms = results[0] || [];
    var users = results[1] || [];

    var roomRows = rooms.length ? rooms.map(function (r) {
      return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.code) + '</td><td>' + esc(r.id) + '</td><td>' +
        (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;">No rooms yet.</td></tr>';
    document.getElementById('adminRoomsList').innerHTML =
      '<table class="data-table"><thead><tr><th>Name</th><th>Code</th><th>ID</th><th>Created</th></tr></thead><tbody>' + roomRows + '</tbody></table>';

    var userRows = users.length ? users.map(function (u) {
      return '<tr><td>' + esc(u.displayName || '') + '</td><td>' + esc(u.email) + '</td><td>' +
        '<span class="badge ' + (u.role === 'admin' ? 'badge-success' : 'badge-info') + '">' + esc(u.role || 'member') + '</span></td><td>' +
        (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;">No users yet.</td></tr>';
    document.getElementById('adminUsersList').innerHTML =
      '<table class="data-table"><thead><tr><th>Display name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>' + userRows + '</tbody></table>';

  }).catch(function () {
    loading.style.display  = 'none';
    forbidden.style.display = 'block';
    forbidden.textContent = 'Failed to load admin data or access denied.';
  });

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();

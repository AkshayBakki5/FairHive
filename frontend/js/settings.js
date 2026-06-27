/**
 * Settings page – profile edit, password change, room rename, leave room
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var user = FairHiveAuth.getUser() || {};
  var room = FairHiveAuth.getCurrentRoom() || null;

  // ---- populate UI ----
  function refreshUI() {
    user = FairHiveAuth.getUser() || {};
    room = FairHiveAuth.getCurrentRoom() || null;
    var name    = user.displayName || user.email || 'User';
    var initial = name.charAt(0).toUpperCase();
    var el;
    if ((el = document.getElementById('settingsProfileName')))  el.textContent = name;
    if ((el = document.getElementById('settingsProfileEmail'))) el.textContent = user.email || '';
    if ((el = document.getElementById('settingsAvatarInitial'))) el.textContent = initial;
    if ((el = document.getElementById('settingsRoomLabel'))) {
      el.textContent = room ? room.name + ' (' + room.code + ')' : 'No room selected';
    }
  }
  refreshUI();

  // ---- helpers ----
  function showErr(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.style.display = 'block'; } }
  function hideErr(id)      { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
  function showOk(id, msg)  { var el = document.getElementById(id); if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(function () { el.style.display = 'none'; }, 3000); } }

  // ---- Edit profile modal ----
  var profileModal = document.getElementById('profileModal');
  document.getElementById('btnEditProfile').addEventListener('click', function () {
    document.getElementById('inputDisplayName').value = user.displayName || '';
    hideErr('profileError');
    profileModal.style.display = 'flex';
  });
  document.getElementById('profileClose').addEventListener('click', function ()  { profileModal.style.display = 'none'; });
  document.getElementById('profileCancel').addEventListener('click', function () { profileModal.style.display = 'none'; });
  document.getElementById('profileSubmit').addEventListener('click', function () {
    var displayName = document.getElementById('inputDisplayName').value.trim();
    if (!displayName) { showErr('profileError', 'Display name cannot be empty.'); return; }
    hideErr('profileError');
    FairHiveAPI.patch('/auth/profile', { displayName: displayName }).then(function (updated) {
      var stored = FairHiveAuth.getUser() || {};
      stored.displayName = updated.displayName;
      localStorage.setItem('fairhive_user', JSON.stringify(stored));
      profileModal.style.display = 'none';
      refreshUI();
      showOk('profileSuccess', 'Profile updated.');
    }).catch(function (err) {
      showErr('profileError', (err.body && err.body.error) || 'Failed to update profile.');
    });
  });

  // ---- Change password modal ----
  var pwModal = document.getElementById('passwordModal');
  var btnChangePw = document.getElementById('btnChangePassword');
  if (btnChangePw) {
    btnChangePw.addEventListener('click', function () {
      document.getElementById('inputCurrentPw').value = '';
      document.getElementById('inputNewPw').value     = '';
      document.getElementById('inputConfirmPw').value = '';
      hideErr('passwordError');
      pwModal.style.display = 'flex';
    });
  }
  document.getElementById('passwordClose').addEventListener('click',  function () { pwModal.style.display = 'none'; });
  document.getElementById('passwordCancel').addEventListener('click', function () { pwModal.style.display = 'none'; });
  document.getElementById('passwordSubmit').addEventListener('click', function () {
    var current = document.getElementById('inputCurrentPw').value;
    var next    = document.getElementById('inputNewPw').value;
    var confirm = document.getElementById('inputConfirmPw').value;
    hideErr('passwordError');
    if (!current || !next) { showErr('passwordError', 'All fields are required.'); return; }
    if (next.length < 6)   { showErr('passwordError', 'New password must be at least 6 characters.'); return; }
    if (next !== confirm)  { showErr('passwordError', 'Passwords do not match.'); return; }
    FairHiveAPI.patch('/auth/password', { currentPassword: current, newPassword: next }).then(function () {
      pwModal.style.display = 'none';
      showOk('passwordSuccess', 'Password changed successfully.');
    }).catch(function (err) {
      showErr('passwordError', (err.body && err.body.error) || 'Failed to change password.');
    });
  });

  // ---- Edit room name modal ----
  var roomModal = document.getElementById('roomNameModal');
  document.getElementById('btnEditRoomName').addEventListener('click', function () {
    if (!room) { alert('No room selected.'); return; }
    document.getElementById('inputRoomName').value = room.name || '';
    hideErr('roomNameError');
    roomModal.style.display = 'flex';
  });
  document.getElementById('roomNameClose').addEventListener('click',  function () { roomModal.style.display = 'none'; });
  document.getElementById('roomNameCancel').addEventListener('click', function () { roomModal.style.display = 'none'; });
  document.getElementById('roomNameSubmit').addEventListener('click', function () {
    var name = document.getElementById('inputRoomName').value.trim();
    if (!name) { showErr('roomNameError', 'Room name cannot be empty.'); return; }
    hideErr('roomNameError');
    FairHiveAPI.patch('/rooms/' + room.id, { name: name }).then(function (updated) {
      var stored = FairHiveAuth.getCurrentRoom() || {};
      stored.name = updated.name;
      localStorage.setItem('fairhive_room', JSON.stringify(stored));
      room = stored;
      roomModal.style.display = 'none';
      refreshUI();
      showOk('roomNameSuccess', 'Room renamed.');
    }).catch(function (err) {
      showErr('roomNameError', (err.body && err.body.error) || 'Failed to rename room.');
    });
  });

  // ---- Invite ----
  document.getElementById('btnInviteMembers').addEventListener('click', function () {
    window.location.href = 'members.html';
  });

  // ---- Leave room ----
  document.getElementById('btnLeaveRoom').addEventListener('click', function () {
    if (!room) { alert('No room selected.'); return; }
    if (!confirm('Are you sure you want to leave "' + room.name + '"? You will lose access.')) return;
    FairHiveAPI.post('/rooms/' + room.id + '/leave', {}).then(function () {
      localStorage.removeItem('fairhive_room');
      window.location.href = 'dashboard.html';
    }).catch(function (err) {
      alert((err.body && err.body.error) || 'Failed to leave room.');
    });
  });
})();

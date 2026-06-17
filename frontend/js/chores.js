/**
 * Chore Manager – date-based view, creation, stats & fairness
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var room = FairHiveAuth.getCurrentRoom();
  var noRoom = document.getElementById('no-room');
  var hasRoom = document.getElementById('has-room');
  var loading = document.getElementById('loading');

  if (!room) {
    if (noRoom) noRoom.style.display = 'block';
    if (hasRoom) hasRoom.style.display = 'none';
    if (loading) loading.style.display = 'none';
    return;
  }

  if (noRoom) noRoom.style.display = 'none';
  if (hasRoom) hasRoom.style.display = 'block';

  var allChores = [];
  var allMembers = [];
  var selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);

  var choreIcons = [
    { keywords: ['clean', 'cleaning', 'sweep', 'mop', 'vacuum'], icon: '\uD83D\uDCFA', class: 'chore-icon-cleaning' },
    { keywords: ['dish', 'wash', 'kitchen'], icon: '\uD83C\uDF7D', class: 'chore-icon-dishes' },
    { keywords: ['cook', 'cooking', 'meal'], icon: '\uD83C\uDF73', class: 'chore-icon-cooking' },
    { keywords: ['trash', 'garbage', 'bin', 'rubbish'], icon: '\uD83D\uDDD1', class: 'chore-icon-trash' },
    { keywords: ['laundry', 'wash clothes'], icon: '\uD83E\uDDFA', class: 'chore-icon-default' },
    { keywords: ['bathroom', 'toilet'], icon: '\uD83D\uDEBF', class: 'chore-icon-default' },
    { keywords: ['grocery', 'shop'], icon: '\uD83D\uDED2', class: 'chore-icon-default' }
  ];

  var categoryToIcon = {
    cleaning: { icon: '\uD83D\uDCFA', class: 'chore-icon-cleaning' },
    cooking: { icon: '\uD83C\uDF73', class: 'chore-icon-cooking' },
    dishes: { icon: '\uD83C\uDF7D', class: 'chore-icon-dishes' },
    trash: { icon: '\uD83D\uDDD1', class: 'chore-icon-trash' },
    laundry: { icon: '\uD83E\uDDFA', class: 'chore-icon-default' },
    bathroom: { icon: '\uD83D\uDEBF', class: 'chore-icon-default' },
    other: { icon: '\uD83D\uDCCB', class: 'chore-icon-default' }
  };

  function getChoreIcon(title, category) {
    if (category && categoryToIcon[category]) return categoryToIcon[category];
    if (!title) return { icon: '\uD83D\uDCCB', class: 'chore-icon-default' };
    var lower = title.toLowerCase();
    for (var i = 0; i < choreIcons.length; i++) {
      for (var k = 0; k < choreIcons[i].keywords.length; k++) {
        if (lower.indexOf(choreIcons[i].keywords[k]) !== -1) {
          return { icon: choreIcons[i].icon, class: choreIcons[i].class };
        }
      }
    }
    return { icon: '\uD83D\uDCCB', class: 'chore-icon-default' };
  }

  function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    var a = d1 instanceof Date ? d1 : new Date(d1);
    var b = d2 instanceof Date ? d2 : new Date(d2);
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function formatDateLabel(d) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dNorm = new Date(d);
    dNorm.setHours(0, 0, 0, 0);
    if (dNorm.getTime() === today.getTime()) return 'Today';
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dNorm.getTime() === yesterday.getTime()) return 'Yesterday';
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dNorm.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return dNorm.toLocaleDateString();
  }

  function formatDueTime(dueDate) {
    if (!dueDate) return '-';
    var d = new Date(dueDate);
    var h = d.getHours();
    var m = d.getMinutes();
    if (h === 0 && m === 0) return 'All day';
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function getChoresForDate(date) {
    var items = [];
    var dateNorm = new Date(date);
    dateNorm.setHours(0, 0, 0, 0);
    var dateEnd = new Date(dateNorm);
    dateEnd.setHours(23, 59, 59, 999);

    allChores.forEach(function (c) {
      var assignments = c.assignments || [];
      for (var i = 0; i < assignments.length; i++) {
        var a = assignments[i];
        var due = a.dueDate ? new Date(a.dueDate) : null;
        if (!due) continue;
        if (due >= dateNorm && due <= dateEnd) {
          items.push({ chore: c, assignment: a, isCurrent: i === 0 });
          break;
        }
      }
    });
    return items;
  }

  function init() {
    var label = document.getElementById('choresRoomLabel');
    if (label && room) {
      label.textContent = room.name
        ? room.name + ' – chores overview'
        : 'Keep your room\'s chores fair and on track.';
    }

    loadMembers().then(loadChores);
    setupEvents();
    syncDatePicker();
    renderDashboard();

    setInterval(loadChores, 20000);
  }

  function syncDatePicker() {
    var picker = document.getElementById('choreDatePicker');
    var label = document.getElementById('choreDateLabel');
    var listLabel = document.getElementById('choreListDateLabel');
    if (picker) {
      picker.value = selectedDate.toISOString().slice(0, 10);
    }
    if (label) label.textContent = formatDateLabel(selectedDate);
    if (listLabel) listLabel.textContent = formatDateLabel(selectedDate);

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var sel = selectedDate.getTime();

    ['choreDateYesterday', 'choreDateToday', 'choreDateTomorrow'].forEach(function (id, i) {
      var btn = document.getElementById(id);
      if (!btn) return;
      var isActive = (i === 0 && sel === yesterday.getTime()) ||
        (i === 1 && sel === today.getTime()) ||
        (i === 2 && sel === tomorrow.getTime());
      btn.className = 'btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-ghost');
    });
  }

  function loadMembers() {
    return FairHiveAPI.get('/rooms/' + room.id + '/members').then(function (members) {
      allMembers = members || [];
      populateMemberSelect();
      populateRotationMembers();
    }).catch(function () {
      allMembers = [];
    });
  }

  function populateMemberSelect() {
    var select = document.getElementById('choreAssignedTo');
    if (!select) return;
    select.innerHTML = '';
    select.appendChild(document.createElement('option')).value = '';
    select.options[0].textContent = 'Auto-assign (first in rotation)';
    allMembers.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.userId;
      opt.textContent = m.displayName || m.email || m.userId.slice(0, 8);
      select.appendChild(opt);
    });
  }

  function populateRotationMembers() {
    var container = document.getElementById('choreRotationMembers');
    if (!container) return;
    container.innerHTML = '';
    allMembers.forEach(function (m) {
      var name = m.displayName || m.email || m.userId.slice(0, 8);
      var label = document.createElement('label');
      label.className = 'rotation-member-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = m.userId;
      cb.checked = true;
      cb.setAttribute('data-user-id', m.userId);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + name));
      container.appendChild(label);
    });
  }

  function loadChores() {
    if (loading) loading.style.display = 'block';

    FairHiveAPI.get('/rooms/' + room.id + '/chores').then(function (list) {
      allChores = list || [];
      if (loading) loading.style.display = 'none';
      renderDashboard();
    }).catch(function () {
      if (loading) loading.style.display = 'none';
    });
  }

  function renderDashboard() {
    var items = getChoresForDate(selectedDate);
    var statusFilter = (document.getElementById('choreStatusFilter') || {}).value || 'all';

    var filtered = items;
    if (statusFilter === 'pending') filtered = items.filter(function (x) { return !x.assignment.completed; });
    else if (statusFilter === 'completed') filtered = items.filter(function (x) { return x.assignment.completed; });

    var total = items.length;
    var pending = items.filter(function (x) { return !x.assignment.completed; }).length;
    var completed = items.filter(function (x) { return x.assignment.completed; }).length;
    var pointsEarned = items.filter(function (x) { return x.assignment.completed; }).reduce(function (sum, x) {
      return sum + (x.chore.points || 0);
    }, 0);

    setText('totalChoresCount', total);
    setText('pendingChoresCount', pending);
    setText('completedChoresCount', completed);
    setText('pointsEarnedCount', pointsEarned);

    syncDatePicker();
    renderChoresList(filtered, items);
    renderMemberStats();
    renderHistory();
  }

  function renderChoresList(filtered, allItems) {
    var listEl = document.getElementById('choresList');
    var emptyEl = document.getElementById('emptyChores');
    var allCompletedEl = document.getElementById('allCompletedMsg');
    if (!listEl) return;

    if (allItems.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (allCompletedEl) allCompletedEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    var allCompleted = allItems.every(function (x) { return x.assignment.completed; });
    if (allCompleted && isSameDay(selectedDate, new Date())) {
      if (allCompletedEl) allCompletedEl.style.display = 'block';
    } else {
      if (allCompletedEl) allCompletedEl.style.display = 'none';
    }

    var autoRotate = document.getElementById('choreAutoRotate');
    var rotationOn = autoRotate ? autoRotate.checked : true;

    var html = filtered.map(function (item) {
      var c = item.chore;
      var a = item.assignment;
      var memberName = getMemberName(a.userId);
      var dueTime = formatDueTime(a.dueDate);
      var status = a.completed ? 'Completed' : 'Pending';
      var iconInfo = getChoreIcon(c.title, c.category);
      var statusClass = a.completed ? 'status-completed' : 'status-pending';
      var canComplete = !a.completed && item.isCurrent;

      return (
        '<div class="chore-card" data-chore-id="' + c.id + '">' +
          '<div class="chore-card-header">' +
            '<div class="chore-card-left">' +
              '<div class="chore-icon-wrap ' + iconInfo.class + '">' + iconInfo.icon + '</div>' +
              '<div>' +
                '<div class="chore-title">' + escapeHtml(c.title || 'Chore') + '</div>' +
                '<div class="chore-meta">Assigned to ' + escapeHtml(memberName) + ' • Due ' + dueTime + '</div>' +
              '</div>' +
            '</div>' +
            '<span class="status-pill ' + statusClass + '">' + status + '</span>' +
          '</div>' +
          (c.description ? '<div class="chore-meta">' + escapeHtml(c.description) + '</div>' : '') +
          '<div class="chore-tags">' +
            '<span class="badge badge-neutral">' + (c.frequency || 'weekly') + '</span>' +
            '<span class="badge badge-neutral">' + (c.points || 0) + ' pts</span>' +
          '</div>' +
          (canComplete
            ? '<div class="chore-actions">' +
                '<button type="button" class="btn btn-success btn-sm" data-complete-id="' + c.id + '" title="' + (rotationOn ? 'Mark complete & rotate to next member' : 'Mark complete') + '">Mark as Completed</button>' +
              '</div>'
            : '') +
        '</div>'
      );
    }).join('');

    listEl.innerHTML = html;

    listEl.querySelectorAll('[data-complete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-complete-id');
        var autoRotate = document.getElementById('choreAutoRotate');
        var rotate = autoRotate ? autoRotate.checked : true;
        FairHiveAPI.patch('/chores/' + id + '/assignments', { action: 'complete', rotate: rotate }).then(function () {
          loadChores();
        }).catch(function () {});
      });
    });
  }

  function renderMemberStats() {
    var container = document.getElementById('memberStats');
    var emptyEl = document.getElementById('emptyMembers');
    if (!container) return;

    if (!allMembers.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    var stats = {};
    allMembers.forEach(function (m) {
      stats[m.userId] = {
        member: m,
        assigned: 0,
        completed: 0,
        overdue: 0,
      };
    });

    var now = new Date();

    allChores.forEach(function (c) {
      var assignments = c.assignments || [];
      assignments.forEach(function (a) {
        var s = stats[a.userId];
        if (!s) return;
        s.assigned++;
        if (a.completed) {
          s.completed++;
        } else if (a.dueDate && new Date(a.dueDate) < now) {
          s.overdue++;
        }
      });
    });

    var html = Object.keys(stats).map(function (uid) {
      var s = stats[uid];
      var name = s.member.displayName || s.member.email || uid.slice(0, 8);
      var fairness = computeFairnessScore(s);
      return (
        '<div class="member-stat-card">' +
          '<div class="member-info">' +
            '<div class="member-name">' + escapeHtml(name) + '</div>' +
            '<div class="member-counts">' +
              'Completed: ' + s.completed + ' • Pending: ' + Math.max(s.assigned - s.completed, 0) + ' • Overdue: ' + s.overdue +
            '</div>' +
          '</div>' +
          '<div class="fairness-indicator ' + fairness.color + '" title="Fairness: ' + fairness.label + '"></div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML = html;
  }

  function computeFairnessScore(stat) {
    if (stat.assigned === 0) return { color: 'fairness-good', label: 'Balanced' };
    var completionRate = stat.completed / stat.assigned;
    if (completionRate >= 0.8 && stat.overdue === 0) return { color: 'fairness-good', label: 'Balanced' };
    if (completionRate >= 0.5) return { color: 'fairness-warning', label: 'Needs attention' };
    return { color: 'fairness-bad', label: 'Unfair load' };
  }

  function renderHistory() {
    var container = document.getElementById('choreHistory');
    var emptyEl = document.getElementById('emptyHistory');
    if (!container) return;

    var rows = [];
    allChores.forEach(function (c) {
      (c.assignments || []).forEach(function (a) {
        if (!a.completed || !a.completedAt) return;
        var completedAt = new Date(a.completedAt);
        rows.push({
          name: c.title || 'Chore',
          assignedTo: getMemberName(a.userId),
          completedBy: a.completedBy ? getMemberName(a.completedBy) : getMemberName(a.userId),
          completedAt: completedAt,
        });
      });
    });

    rows.sort(function (a, b) { return b.completedAt - a.completedAt; });

    if (!rows.length) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    var html = '<table class="data-table"><thead><tr>' +
      '<th>Chore</th><th>Assigned to</th><th>Completed by</th><th>Completion date</th>' +
      '</tr></thead><tbody>';

    rows.slice(0, 50).forEach(function (r) {
      html += '<tr>' +
        '<td>' + escapeHtml(r.name) + '</td>' +
        '<td>' + escapeHtml(r.assignedTo) + '</td>' +
        '<td>' + escapeHtml(r.completedBy) + '</td>' +
        '<td>' + r.completedAt.toLocaleString() + '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function setupEvents() {
    var autoRotateCheckbox = document.getElementById('choreAutoRotate');
    if (autoRotateCheckbox) {
      try {
        var saved = localStorage.getItem('fairhive_chore_auto_rotate');
        if (saved !== null) autoRotateCheckbox.checked = saved === 'true';
      } catch (_) {}
      autoRotateCheckbox.addEventListener('change', function () {
        try {
          localStorage.setItem('fairhive_chore_auto_rotate', this.checked);
        } catch (_) {}
        renderDashboard();
      });
    }

    function changeDate(d) {
      selectedDate = new Date(d);
      selectedDate.setHours(0, 0, 0, 0);
      syncDatePicker();
      renderDashboard();
    }

    function navigateDate(delta) {
      var d = new Date(selectedDate);
      d.setDate(d.getDate() + delta);
      changeDate(d);
    }

    var prevBtn = document.getElementById('choreDatePrev');
    var nextBtn = document.getElementById('choreDateNext');
    var yesterdayBtn = document.getElementById('choreDateYesterday');
    var todayBtn = document.getElementById('choreDateToday');
    var tomorrowBtn = document.getElementById('choreDateTomorrow');
    var datePicker = document.getElementById('choreDatePicker');
    var statusFilter = document.getElementById('choreStatusFilter');

    if (prevBtn) prevBtn.addEventListener('click', function () { navigateDate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { navigateDate(1); });
    if (yesterdayBtn) yesterdayBtn.addEventListener('click', function () {
      var d = new Date();
      d.setDate(d.getDate() - 1);
      changeDate(d);
    });
    if (todayBtn) todayBtn.addEventListener('click', function () { changeDate(new Date()); });
    if (tomorrowBtn) tomorrowBtn.addEventListener('click', function () {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      changeDate(d);
    });
    if (datePicker) datePicker.addEventListener('change', function () {
      if (this.value) changeDate(new Date(this.value));
    });
    if (statusFilter) statusFilter.addEventListener('change', function () { renderDashboard(); });

    var btnAdd = document.getElementById('btnAddChore');
    var modal = document.getElementById('addChoreModal');
    var close = document.getElementById('addChoreClose');
    var cancel = document.getElementById('addChoreCancel');
    var submit = document.getElementById('addChoreSubmit');

    function hideModal() {
      if (modal) modal.style.display = 'none';
    }

    function showModal() {
      if (!modal) return;
      populateMemberSelect();
      populateRotationMembers();
      modal.style.display = 'flex';
      resetChoreForm();
      setTimeout(function () {
        fixFormLabels(modal);
      }, 50);
    }

    if (btnAdd) btnAdd.addEventListener('click', showModal);
    if (close) close.addEventListener('click', hideModal);
    if (cancel) cancel.addEventListener('click', hideModal);
    if (submit) submit.addEventListener('click', submitChore);

    if (modal) {
      var choreDueDate = document.getElementById('choreDueDate');
      if (choreDueDate) choreDueDate.addEventListener('change', function () { fixFormLabels(modal); });
      modal.querySelectorAll('select').forEach(function (select) {
        select.addEventListener('change', function () { fixFormLabels(modal); });
      });
    }
  }

  function fixFormLabels(container) {
    if (!container) container = document;
    container.querySelectorAll('input[type="date"]').forEach(function (input) {
      var label = container.querySelector('label[for="' + input.id + '"]');
      if (label) {
        if (input.value) {
          label.classList.add('label-floated');
          input.classList.add('has-value');
        } else {
          label.classList.remove('label-floated');
          input.classList.remove('has-value');
        }
      }
    });
  }

  function resetChoreForm() {
    setValue('choreTitle', '');
    setValue('choreDescription', '');
    setValue('choreCategory', 'cleaning');
    setValue('choreFrequency', 'weekly');
    setValue('chorePoints', '10');
    setValue('choreDueDate', '');
    setValue('choreDueTime', '');
    var assignedSelect = document.getElementById('choreAssignedTo');
    if (assignedSelect) assignedSelect.value = '';
    var err = document.getElementById('addChoreError');
    if (err) err.style.display = 'none';
    var container = document.getElementById('choreRotationMembers');
    if (container) container.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
    setTimeout(function () {
      var modal = document.getElementById('addChoreModal');
      if (modal) fixFormLabels(modal);
    }, 10);
  }

  function submitChore() {
    var title = getValue('choreTitle').trim();
    var description = getValue('choreDescription').trim();
    var category = getValue('choreCategory') || 'other';
    var frequency = getValue('choreFrequency') || 'weekly';
    var points = parseInt(getValue('chorePoints'), 10);
    if (isNaN(points) || points < 0) points = 10;
    var dueDate = getValue('choreDueDate') || '';
    var dueTime = getValue('choreDueTime') || '';
    var assignedTo = getValue('choreAssignedTo') || '';
    var err = document.getElementById('addChoreError');

    var rotationOrder = [];
    var container = document.getElementById('choreRotationMembers');
    if (container) {
      container.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
        rotationOrder.push(cb.value);
      });
    }
    if (rotationOrder.length === 0) {
      rotationOrder = allMembers.map(function (m) { return m.userId; });
    }

    if (!title) {
      if (err) { err.textContent = 'Enter a title.'; err.style.display = 'block'; }
      return;
    }

    if (rotationOrder.length === 0) {
      if (err) { err.textContent = 'No members in room.'; err.style.display = 'block'; }
      return;
    }

    if (err) err.style.display = 'none';

    var body = {
      title: title,
      description: description,
      category: category,
      points: points,
      frequency: frequency,
      priority: 'medium',
      rotationOrder: rotationOrder,
    };
    if (assignedTo) body.assignedTo = assignedTo;

    if (dueDate) {
      body.dueDate = dueTime ? (dueDate + 'T' + dueTime) : (dueDate + 'T12:00:00');
    }

    FairHiveAPI.post('/rooms/' + room.id + '/chores', body).then(function () {
      var modal = document.getElementById('addChoreModal');
      if (modal) modal.style.display = 'none';
      loadChores();
    }).catch(function (errResp) {
      if (err) {
        err.textContent = (errResp.body && errResp.body.error) || 'Failed to add chore';
        err.style.display = 'block';
      }
    });
  }

  function getMemberName(userId) {
    var m = allMembers.find(function (mm) { return mm.userId === userId; });
    return m ? (m.displayName || m.email || userId.slice(0, 8)) : userId.slice(0, 8);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function getValue(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  init();
})();

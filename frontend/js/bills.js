/**
 * Bills page – list, add, edit, delete, mark paid
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var room      = FairHiveAuth.getCurrentRoom();
  var noRoom    = document.getElementById('no-room');
  var loading   = document.getElementById('loading');
  var billList  = document.getElementById('billList');
  var emptyBills = document.getElementById('emptyBills');

  if (!room) {
    if (noRoom)   noRoom.style.display   = 'block';
    if (loading)  loading.style.display  = 'none';
    return;
  }

  // ---- helpers ----
  function fmtDate(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return isNaN(dt) ? '-' : dt.toLocaleDateString();
  }
  function fmtAmt(n) { return '₹' + (parseFloat(n) || 0).toFixed(2); }
  function showErr(elId, msg) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hideErr(elId) {
    var el = document.getElementById(elId);
    if (el) el.style.display = 'none';
  }

  // ---- upload helper ----
  function uploadFile(file, done) {
    var form  = new FormData();
    form.append('file', file);
    var token = FairHiveAuth.getToken();
    fetch(FairHiveAPI.baseURL + '/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: form,
    }).then(function (r) { return r.json(); })
      .then(function (d) { done(null, d.url); })
      .catch(function (e) { done(e); });
  }

  // ---- load & render ----
  function loadBills() {
    loading.style.display = 'block';
    if (billList)  billList.style.display  = 'none';
    if (emptyBills) emptyBills.style.display = 'none';

    FairHiveAPI.get('/rooms/' + room.id + '/bills').then(function (list) {
      loading.style.display = 'none';
      if (!list.length) { if (emptyBills) emptyBills.style.display = 'block'; return; }

      var html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Name</th><th>Amount</th><th>Due date</th><th>Proof</th><th>Status</th><th>Actions</th>' +
        '</tr></thead><tbody>';
      list.forEach(function (b) {
        var proof  = b.billImageUrl ? '<a href="' + b.billImageUrl + '" target="_blank" rel="noopener">View</a>' : '-';
        var status = b.paid
          ? '<span class="badge badge-success">Paid</span>'
          : '<span class="badge badge-warning">Unpaid</span>';
        var actions = '';
        if (!b.paid) {
          actions += '<button class="btn btn-success btn-sm" data-action="pay" data-id="' + b.id + '" style="margin-right:4px;">Mark paid</button>';
        }
        actions += '<button class="btn btn-ghost btn-sm" data-action="edit" data-id="' + b.id + '" data-name="' + encodeURIComponent(b.name || '') + '" data-amount="' + (b.amount || 0) + '" data-due="' + (b.dueDate ? b.dueDate.slice(0,10) : '') + '" style="margin-right:4px;">Edit</button>';
        actions += '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + b.id + '">Delete</button>';

        html += '<tr><td>' + (b.name || '-') + '</td><td>' + fmtAmt(b.amount) + '</td><td>' +
          fmtDate(b.dueDate) + '</td><td>' + proof + '</td><td>' + status + '</td><td>' + actions + '</td></tr>';
      });
      html += '</tbody></table></div>';
      billList.innerHTML = html;
      billList.style.display = 'block';

      // bind action buttons
      billList.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id  = btn.getAttribute('data-id');
          var act = btn.getAttribute('data-action');
          if (act === 'pay') {
            FairHiveAPI.patch('/bills/' + id, { paid: true }).then(loadBills).catch(function () {});
          } else if (act === 'delete') {
            if (!confirm('Delete this bill?')) return;
            FairHiveAPI.delete('/bills/' + id).then(loadBills).catch(function () {
              alert('Failed to delete bill.');
            });
          } else if (act === 'edit') {
            openEditModal(id,
              decodeURIComponent(btn.getAttribute('data-name') || ''),
              btn.getAttribute('data-amount') || '',
              btn.getAttribute('data-due') || ''
            );
          }
        });
      });
    }).catch(function () {
      loading.style.display = 'none';
      if (billList) { billList.innerHTML = '<p class="alert alert-error">Failed to load bills.</p>'; billList.style.display = 'block'; }
    });
  }

  // ---- Add modal ----
  var addModal = document.getElementById('addBillModal');
  document.getElementById('btnAddBill').addEventListener('click', function () {
    addModal.style.display = 'flex';
    hideErr('addBillError');
    document.getElementById('billName').value    = '';
    document.getElementById('billAmount').value  = '';
    document.getElementById('billDueDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('billImageUrl').value = '';
  });
  document.getElementById('addBillClose').addEventListener('click', function () { addModal.style.display = 'none'; });
  document.getElementById('addBillCancel').addEventListener('click', function () { addModal.style.display = 'none'; });

  document.getElementById('addBillSubmit').addEventListener('click', function () {
    var name   = document.getElementById('billName').value.trim() || 'Bill';
    var amount = parseFloat(document.getElementById('billAmount').value);
    var due    = document.getElementById('billDueDate').value || new Date().toISOString().slice(0, 10);
    var imgUrl = document.getElementById('billImageUrl').value.trim() || null;
    var fileInput = document.getElementById('billImageFile');
    hideErr('addBillError');
    if (isNaN(amount) || amount < 0) { showErr('addBillError', 'Enter a valid amount.'); return; }

    function submit(body) {
      FairHiveAPI.post('/rooms/' + room.id + '/bills', body).then(function () {
        addModal.style.display = 'none';
        loadBills();
      }).catch(function (err) {
        showErr('addBillError', (err.body && err.body.error) || 'Failed to add bill.');
      });
    }
    var body = { name: name, amount: amount, dueDate: due };
    if (imgUrl) body.billImageUrl = imgUrl;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      uploadFile(fileInput.files[0], function (err, url) {
        if (err) { showErr('addBillError', 'Upload failed'); return; }
        body.billImageUrl = url;
        submit(body);
      });
    } else {
      submit(body);
    }
  });

  // ---- Edit modal ----
  function openEditModal(id, name, amount, due) {
    document.getElementById('editBillId').value      = id;
    document.getElementById('editBillName').value    = name;
    document.getElementById('editBillAmount').value  = amount;
    document.getElementById('editBillDueDate').value = due;
    hideErr('editBillError');
    document.getElementById('editBillModal').style.display = 'flex';
  }
  document.getElementById('editBillClose').addEventListener('click', function () { document.getElementById('editBillModal').style.display = 'none'; });
  document.getElementById('editBillCancel').addEventListener('click', function () { document.getElementById('editBillModal').style.display = 'none'; });
  document.getElementById('editBillSubmit').addEventListener('click', function () {
    var id     = document.getElementById('editBillId').value;
    var name   = document.getElementById('editBillName').value.trim() || 'Bill';
    var amount = parseFloat(document.getElementById('editBillAmount').value);
    var due    = document.getElementById('editBillDueDate').value;
    hideErr('editBillError');
    if (isNaN(amount) || amount < 0) { showErr('editBillError', 'Enter a valid amount.'); return; }
    FairHiveAPI.patch('/bills/' + id, { name: name, amount: amount, dueDate: due }).then(function () {
      document.getElementById('editBillModal').style.display = 'none';
      loadBills();
    }).catch(function (err) {
      showErr('editBillError', (err.body && err.body.error) || 'Failed to update bill.');
    });
  });

  loadBills();
})();

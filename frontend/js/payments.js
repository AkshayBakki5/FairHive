/**
 * Payments page – list, record, delete debt-settlement payments
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var room        = FairHiveAuth.getCurrentRoom();
  var currentUser = FairHiveAuth.getUser();
  var noRoom      = document.getElementById('no-room');
  var loading     = document.getElementById('loading');
  var payList     = document.getElementById('paymentList');
  var emptyPay    = document.getElementById('emptyPayments');

  if (!room) {
    if (noRoom)  noRoom.style.display  = 'block';
    if (loading) loading.style.display = 'none';
    return;
  }

  var allMembers = [];

  function fmtAmt(n) { return '₹' + (parseFloat(n) || 0).toFixed(2); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '-'; }
  function showErr(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.style.display = 'block'; } }
  function hideErr(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }

  function populateMemberSelect(selectId, excludeUserId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select member --</option>';
    allMembers.forEach(function (m) {
      if (excludeUserId && m.userId === excludeUserId) return;
      var opt = document.createElement('option');
      opt.value = m.userId;
      opt.textContent = m.displayName || m.email || m.userId;
      sel.appendChild(opt);
    });
  }

  function loadAll() {
    loading.style.display = 'block';
    if (payList)  payList.style.display  = 'none';
    if (emptyPay) emptyPay.style.display = 'none';

    Promise.all([
      FairHiveAPI.get('/rooms/' + room.id + '/members'),
      FairHiveAPI.get('/payments/rooms/' + room.id + '/payments'),
    ]).then(function (results) {
      loading.style.display = 'none';
      allMembers = results[0] || [];
      var payments = results[1] || [];

      populateMemberSelect('payToUser', currentUser ? currentUser.id : null);

      if (!payments.length) {
        if (emptyPay) emptyPay.style.display = 'block';
        return;
      }

      var html = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>From</th><th>To</th><th>Amount</th><th>Note</th><th>Date</th><th>Action</th>' +
        '</tr></thead><tbody>';

      payments.forEach(function (p) {
        var canDelete = currentUser && (
          (p.fromUser && p.fromUser.toString() === currentUser.id) ||
          currentUser.role === 'admin'
        );
        var delBtn = canDelete
          ? '<button class="btn btn-danger btn-sm" data-action="delete" data-id="' + p.id + '">Delete</button>'
          : '-';
        html += '<tr><td>' + (p.fromUserName || p.fromUser || '-') + '</td>' +
          '<td>' + (p.toUserName || p.toUser || '-') + '</td>' +
          '<td>' + fmtAmt(p.amount) + '</td>' +
          '<td>' + (p.note || '-') + '</td>' +
          '<td>' + fmtDate(p.createdAt) + '</td>' +
          '<td>' + delBtn + '</td></tr>';
      });
      html += '</tbody></table></div>';
      payList.innerHTML = html;
      payList.style.display = 'block';

      payList.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete this payment record?')) return;
          FairHiveAPI.delete('/payments/' + btn.getAttribute('data-id')).then(loadAll).catch(function (err) {
            alert((err.body && err.body.error) || 'Failed to delete payment.');
          });
        });
      });
    }).catch(function () {
      loading.style.display = 'none';
      if (payList) { payList.innerHTML = '<p class="alert alert-error">Failed to load payments.</p>'; payList.style.display = 'block'; }
    });
  }

  // ---- Add payment modal ----
  var addModal = document.getElementById('addPaymentModal');
  document.getElementById('btnAddPayment').addEventListener('click', function () {
    hideErr('addPaymentError');
    document.getElementById('payAmount').value = '';
    document.getElementById('payNote').value   = '';
    populateMemberSelect('payToUser', currentUser ? currentUser.id : null);
    addModal.style.display = 'flex';
  });
  document.getElementById('addPaymentClose').addEventListener('click',  function () { addModal.style.display = 'none'; });
  document.getElementById('addPaymentCancel').addEventListener('click', function () { addModal.style.display = 'none'; });
  document.getElementById('addPaymentSubmit').addEventListener('click', function () {
    var toUser = document.getElementById('payToUser').value;
    var amount = parseFloat(document.getElementById('payAmount').value);
    var note   = (document.getElementById('payNote').value || '').trim();
    hideErr('addPaymentError');
    if (!toUser)            { showErr('addPaymentError', 'Select a recipient.'); return; }
    if (isNaN(amount) || amount <= 0) { showErr('addPaymentError', 'Enter a valid amount.'); return; }
    FairHiveAPI.post('/payments/rooms/' + room.id + '/payments', { toUser: toUser, amount: amount, note: note }).then(function () {
      addModal.style.display = 'none';
      loadAll();
    }).catch(function (err) {
      showErr('addPaymentError', (err.body && err.body.error) || 'Failed to record payment.');
    });
  });

  loadAll();
})();

/**
 * Expense Tracker Page Logic
 */
(function () {
  if (!FairHiveAuth.guard()) return;
  FairHiveLayout.initLayout();

  var room = FairHiveAuth.getCurrentRoom();
  var currentUser = FairHiveAuth.getUser();
  var noRoom = document.getElementById('no-room');
  var hasRoom = document.getElementById('has-room');
  var loading = document.getElementById('loading');
  var expenseList = document.getElementById('expenseList');
  var emptyExpenses = document.getElementById('emptyExpenses');
  var recentExpenses = document.getElementById('recentExpenses');
  var emptyRecent = document.getElementById('emptyRecent');
  var balanceSummary = document.getElementById('balanceSummary');
  var settlementSuggestions = document.getElementById('settlementSuggestions');

  // State
  var allExpenses = [];
  var allMembers = [];
  var currentMonthFilter = 'this'; // 'this' or 'last'
  var currentFilter = 'all';
  var filteredExpenses = [];

  // Category configuration
  var categories = {
    rent: { name: 'Rent', icon: '🏠', class: 'category-icon-rent' },
    electricity: { name: 'Electricity', icon: '⚡', class: 'category-icon-electricity' },
    water: { name: 'Water', icon: '💧', class: 'category-icon-water' },
    internet: { name: 'Internet', icon: '🌐', class: 'category-icon-internet' },
    groceries: { name: 'Groceries', icon: '🛒', class: 'category-icon-groceries' },
    other: { name: 'Other', icon: '📦', class: 'category-icon-other' }
  };

  if (!room) {
    noRoom.style.display = 'block';
    hasRoom.style.display = 'none';
    if (loading) loading.style.display = 'none';
    return;
  }

  hasRoom.style.display = 'block';
  noRoom.style.display = 'none';

  // Initialize
  function init() {
    updateRoomName();
    loadMembers();
    loadExpenses();
    setupEventListeners();
  }

  function updateRoomName() {
    var roomNameEl = document.getElementById('roomNameDisplay');
    if (roomNameEl && room) {
      roomNameEl.textContent = 'FairHive – ' + (room.name || 'Room ' + room.code);
    }
  }

  function loadMembers() {
    FairHiveAPI.get('/rooms/' + room.id + '/members').then(function (members) {
      allMembers = members;
      populateMemberSelects();
    }).catch(function () {
      console.error('Failed to load members');
    });
  }

  function populateMemberSelects() {
    // Populate "Paid By" select
    var paidBySelect = document.getElementById('expensePaidBy');
    if (paidBySelect) {
      paidBySelect.innerHTML = '<option value="">Select member...</option>';
      allMembers.forEach(function (m) {
        var option = document.createElement('option');
        option.value = m.userId;
        option.textContent = m.displayName || m.email || m.userId.slice(0, 8);
        if (m.userId === currentUser.id) option.selected = true;
        paidBySelect.appendChild(option);
      });
    }

    // Populate "Split Between" checkboxes with avatar and name
    var splitMembersList = document.getElementById('splitMembersList');
    if (splitMembersList) {
      splitMembersList.innerHTML = '';
      allMembers.forEach(function (m) {
        var name = m.displayName || m.email || m.userId.slice(0, 8);
        var initial = (name.charAt(0) || '?').toUpperCase();
        var item = document.createElement('div');
        item.className = 'split-member-item';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'split-member-' + m.userId;
        checkbox.value = m.userId;
        checkbox.checked = true;
        var label = document.createElement('label');
        label.htmlFor = 'split-member-' + m.userId;
        label.className = 'split-member-label';
        var avatarSpan = document.createElement('span');
        avatarSpan.className = 'split-member-avatar';
        avatarSpan.textContent = initial;
        var nameSpan = document.createElement('span');
        nameSpan.className = 'split-member-name';
        nameSpan.textContent = name;
        label.appendChild(avatarSpan);
        label.appendChild(nameSpan);
        item.appendChild(checkbox);
        item.appendChild(label);
        splitMembersList.appendChild(item);
      });
    }

    // Populate settle payment selects
    var settleFrom = document.getElementById('settleFrom');
    var settleTo = document.getElementById('settleTo');
    if (settleFrom) {
      settleFrom.innerHTML = '<option value="">Select member...</option>';
      allMembers.forEach(function (m) {
        var option = document.createElement('option');
        option.value = m.userId;
        option.textContent = m.displayName || m.email || m.userId.slice(0, 8);
        settleFrom.appendChild(option);
      });
    }
    if (settleTo) {
      settleTo.innerHTML = '<option value="">Select member...</option>';
      allMembers.forEach(function (m) {
        var option = document.createElement('option');
        option.value = m.userId;
        option.textContent = m.displayName || m.email || m.userId.slice(0, 8);
        settleTo.appendChild(option);
      });
    }

    // Populate filter member select
    var filterMember = document.getElementById('filterMember');
    if (filterMember) {
      filterMember.innerHTML = '<option value="">All Members</option>';
      allMembers.forEach(function (m) {
        var option = document.createElement('option');
        option.value = m.userId;
        option.textContent = m.displayName || m.email || m.userId.slice(0, 8);
        filterMember.appendChild(option);
      });
    }
  }

  function loadExpenses() {
    if (loading) loading.style.display = 'block';
    if (expenseList) expenseList.style.display = 'none';
    if (emptyExpenses) emptyExpenses.style.display = 'none';

    FairHiveAPI.get('/rooms/' + room.id + '/expenses').then(function (list) {
      allExpenses = list;
      applyFilters();
      renderExpenses();
      renderRecentExpenses();
      loadBalances();
      updateSummary();
      if (loading) loading.style.display = 'none';
    }).catch(function () {
      if (loading) loading.style.display = 'none';
      if (expenseList) {
        expenseList.innerHTML = '<p class="alert alert-error">Failed to load expenses.</p>';
        expenseList.style.display = 'block';
      }
    });
  }

  function applyFilters() {
    filteredExpenses = allExpenses.filter(function (e) {
      // Month filter
      if (currentMonthFilter === 'this') {
        var now = new Date();
        var expenseDate = e.createdAt ? new Date(e.createdAt) : new Date();
        if (expenseDate.getMonth() !== now.getMonth() || expenseDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (currentMonthFilter === 'last') {
        var now = new Date();
        var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        var expenseDate = e.createdAt ? new Date(e.createdAt) : new Date();
        if (expenseDate.getMonth() !== lastMonth.getMonth() || expenseDate.getFullYear() !== lastMonth.getFullYear()) {
          return false;
        }
      }

      // Category filter
      var categoryFilter = document.getElementById('filterCategory');
      if (categoryFilter && categoryFilter.value && e.category !== categoryFilter.value) {
        return false;
      }

      // Member filter
      var memberFilter = document.getElementById('filterMember');
      if (memberFilter && memberFilter.value) {
        var hasMember = false;
        if (e.addedBy === memberFilter.value) hasMember = true;
        if (e.splits) {
          e.splits.forEach(function (s) {
            if (s.userId === memberFilter.value) hasMember = true;
          });
        }
        if (!hasMember) return false;
      }

      // Date filter
      var dateFrom = document.getElementById('filterDateFrom');
      var dateTo = document.getElementById('filterDateTo');
      if (dateFrom && dateFrom.value) {
        var fromDate = new Date(dateFrom.value);
        var expenseDate = e.createdAt ? new Date(e.createdAt) : new Date();
        if (expenseDate < fromDate) return false;
      }
      if (dateTo && dateTo.value) {
        var toDate = new Date(dateTo.value);
        toDate.setHours(23, 59, 59, 999);
        var expenseDate = e.createdAt ? new Date(e.createdAt) : new Date();
        if (expenseDate > toDate) return false;
      }

      return true;
    });
  }

  function renderExpenses() {
    if (!expenseList) return;

    if (filteredExpenses.length === 0) {
      if (emptyExpenses) emptyExpenses.style.display = 'block';
      expenseList.style.display = 'none';
      return;
    }

    if (emptyExpenses) emptyExpenses.style.display = 'none';
    var html = '';
    filteredExpenses.forEach(function (e) {
      var category = e.category || 'other';
      var categoryInfo = categories[category] || categories.other;
      var date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-';
      var paidBy = getMemberName(e.addedBy);
      var allSettled = true;
      var splitsHtml = '';

      if (e.splits && e.splits.length > 0) {
        e.splits.forEach(function (s) {
          if (!s.paid) allSettled = false;
          var statusBadge = s.paid 
            ? '<span class="badge badge-success">Settled</span>' 
            : '<span class="badge badge-warning">Unsettled</span>';
          splitsHtml += '<div class="expense-split-item">' + 
            getMemberName(s.userId) + ': ₹' + (s.amount || 0).toFixed(2) + ' ' + statusBadge + 
            '</div>';
        });
      }

      var statusBadge = allSettled 
        ? '<span class="badge badge-success">Settled</span>' 
        : '<span class="badge badge-warning">Unsettled</span>';

      html += '<div class="expense-card">' +
        '<div class="expense-card-header">' +
        '<div class="expense-card-left">' +
        '<div class="expense-category-icon ' + categoryInfo.class + '">' + categoryInfo.icon + '</div>' +
        '<div class="expense-card-info">' +
        '<div class="expense-card-title">' + (e.description || 'Expense') + '</div>' +
        '<div class="expense-card-meta">' +
        '<span>Paid by ' + paidBy + '</span>' +
        '<span>•</span>' +
        '<span>' + date + '</span>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="expense-card-right">' +
        '<div class="expense-card-amount">₹' + (e.amount || 0).toFixed(2) + '</div>' +
        '<div>' + statusBadge + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="expense-card-footer">' +
        '<div class="expense-splits">' + splitsHtml + '</div>' +
        (e.billImageUrl ? '<a href="' + e.billImageUrl + '" target="_blank" class="btn btn-ghost btn-sm">View Bill</a>' : '') +
        '</div>' +
        '</div>';
    });

    expenseList.innerHTML = html;
    expenseList.style.display = 'block';
  }

  function renderRecentExpenses() {
    if (!recentExpenses) return;

    var recent = allExpenses.slice(0, 5);
    if (recent.length === 0) {
      if (emptyRecent) emptyRecent.style.display = 'block';
      recentExpenses.innerHTML = '';
      return;
    }

    if (emptyRecent) emptyRecent.style.display = 'none';
    var html = '';
    recent.forEach(function (e) {
      var category = e.category || 'other';
      var categoryInfo = categories[category] || categories.other;
      var date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-';
      var paidBy = getMemberName(e.addedBy);
      var allSettled = true;
      if (e.splits) {
        e.splits.forEach(function (s) {
          if (!s.paid) allSettled = false;
        });
      }
      var statusBadge = allSettled 
        ? '<span class="badge badge-success">Settled</span>' 
        : '<span class="badge badge-warning">Unsettled</span>';

      html += '<div class="recent-expense-item">' +
        '<div class="recent-expense-left">' +
        '<div class="recent-expense-icon ' + categoryInfo.class + '">' + categoryInfo.icon + '</div>' +
        '<div class="recent-expense-info">' +
        '<div class="recent-expense-title">' + (e.description || 'Expense') + '</div>' +
        '<div class="recent-expense-meta">Paid by ' + paidBy + ' • ' + date + '</div>' +
        '</div>' +
        '</div>' +
        '<div class="recent-expense-right">' +
        '<div class="recent-expense-amount">₹' + (e.amount || 0).toFixed(2) + '</div>' +
        '<div class="recent-expense-status">' + statusBadge + '</div>' +
        '</div>' +
        '</div>';
    });

    recentExpenses.innerHTML = html;
  }

  function loadBalances() {
    FairHiveAPI.get('/rooms/' + room.id + '/balances').then(function (balances) {
      renderBalanceSummary(balances);
      generateSettlementSuggestions(balances);
    }).catch(function () {
      console.error('Failed to load balances');
    });
  }

  function renderBalanceSummary(balances) {
    if (!balanceSummary) return;

    var html = '';
    var userId = currentUser.id;
    var userBalance = balances[userId] || 0;

    // Filter to only show balances for current room members
    var currentMemberIds = allMembers.map(function(m) { return m.userId; });

    Object.keys(balances).forEach(function (uid) {
      // Skip users who are not current room members
      if (currentMemberIds.indexOf(uid) === -1) return;

      var b = balances[uid];
      var member = allMembers.find(function (m) { return m.userId === uid; });
      var name = member ? (member.displayName || member.email || uid.slice(0, 8)) : uid.slice(0, 8);
      var isPositive = b >= 0;
      var cardClass = isPositive ? 'balance-card-positive' : 'balance-card-negative';
      var amountClass = isPositive ? 'balance-amount-positive' : 'balance-amount-negative';
      var label = isPositive ? 'Gets' : 'Owes';

      html += '<div class="balance-card ' + cardClass + '">' +
        '<div class="balance-member-name">' + name + '</div>' +
        '<div class="balance-amount ' + amountClass + '">' + (isPositive ? '+' : '') + '₹' + Math.abs(b).toFixed(2) + '</div>' +
        '<div class="balance-label">' + label + '</div>' +
        '</div>';
    });

    balanceSummary.innerHTML = html || '<p style="color: var(--text-muted);">No balances yet.</p>';
  }

  function generateSettlementSuggestions(balances) {
    if (!settlementSuggestions) return;

    var suggestions = [];
    var userId = currentUser.id;
    var userBalance = balances[userId] || 0;

    // Filter to only include balances for current room members
    var currentMemberIds = allMembers.map(function(m) { return m.userId; });

    // Find who owes money (negative balance) and who should receive (positive balance)
    var debtors = [];
    var creditors = [];

    Object.keys(balances).forEach(function (uid) {
      // Skip users who are not current room members
      if (currentMemberIds.indexOf(uid) === -1) return;

      var b = balances[uid];
      if (b < 0) debtors.push({ userId: uid, amount: Math.abs(b) });
      if (b > 0) creditors.push({ userId: uid, amount: b });
    });

    // Generate suggestions: match debtors with creditors
    debtors.forEach(function (debtor) {
      creditors.forEach(function (creditor) {
        if (debtor.amount > 0 && creditor.amount > 0) {
          var amount = Math.min(debtor.amount, creditor.amount);
          var debtorMember = allMembers.find(function (m) { return m.userId === debtor.userId; });
          var creditorMember = allMembers.find(function (m) { return m.userId === creditor.userId; });
          var debtorName = debtorMember ? (debtorMember.displayName || debtorMember.email || debtor.userId.slice(0, 8)) : debtor.userId.slice(0, 8);
          var creditorName = creditorMember ? (creditorMember.displayName || creditorMember.email || creditor.userId.slice(0, 8)) : creditor.userId.slice(0, 8);

          suggestions.push({
            from: debtorName,
            fromId: debtor.userId,
            to: creditorName,
            toId: creditor.userId,
            amount: amount
          });

          debtor.amount -= amount;
          creditor.amount -= amount;
        }
      });
    });

    if (suggestions.length === 0) {
      settlementSuggestions.style.display = 'none';
      return;
    }

    var html = '<div class="settlement-suggestions-title">Settlement Suggestions</div>';
    suggestions.forEach(function (s) {
      html += '<div class="settlement-item">' +
        '<div class="settlement-text">' + s.from + ' → ' + s.to + '</div>' +
        '<div class="settlement-amount">₹' + s.amount.toFixed(2) + '</div>' +
        '</div>';
    });

    settlementSuggestions.innerHTML = html;
    settlementSuggestions.style.display = 'block';
  }

  function updateSummary() {
    var total = 0;
    var userId = currentUser.id;
    var youOwe = 0;
    var youGet = 0;

    filteredExpenses.forEach(function (e) {
      total += e.amount || 0;
      if (e.splits) {
        e.splits.forEach(function (s) {
          if (s.userId === userId) {
            if (e.addedBy === userId) {
              // User paid, others owe them
              youGet += s.amount || 0;
            } else {
              // Others paid, user owes
              youOwe += s.amount || 0;
            }
          }
        });
      }
    });

    // Get actual balances
    FairHiveAPI.get('/rooms/' + room.id + '/balances').then(function (balances) {
      var userBalance = balances[userId] || 0;
      if (userBalance < 0) {
        youOwe = Math.abs(userBalance);
        youGet = 0;
      } else {
        youOwe = 0;
        youGet = userBalance;
      }

      var totalEl = document.getElementById('totalExpenses');
      var youOweEl = document.getElementById('youOwe');
      var youGetEl = document.getElementById('youGet');

      if (totalEl) totalEl.textContent = '₹' + total.toFixed(2);
      if (youOweEl) youOweEl.textContent = '₹' + youOwe.toFixed(2);
      if (youGetEl) youGetEl.textContent = '₹' + youGet.toFixed(2);
    });
  }

  function getMemberName(userId) {
    var member = allMembers.find(function (m) { return m.userId === userId; });
    return member ? (member.displayName || member.email || userId.slice(0, 8)) : userId.slice(0, 8);
  }

  function setupEventListeners() {
    // Month selector
    var btnThisMonth = document.getElementById('btnThisMonth');
    var btnLastMonth = document.getElementById('btnLastMonth');
    if (btnThisMonth) {
      btnThisMonth.addEventListener('click', function () {
        currentMonthFilter = 'this';
        btnThisMonth.classList.add('month-btn-active');
        if (btnLastMonth) btnLastMonth.classList.remove('month-btn-active');
        applyFilters();
        renderExpenses();
        updateSummary();
      });
    }
    if (btnLastMonth) {
      btnLastMonth.addEventListener('click', function () {
        currentMonthFilter = 'last';
        btnLastMonth.classList.add('month-btn-active');
        if (btnThisMonth) btnThisMonth.classList.remove('month-btn-active');
        applyFilters();
        renderExpenses();
        updateSummary();
      });
    }

    // Filter buttons
    var filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        showFilterPanel();
      });
    });

    // Filter inputs
    var filterCategory = document.getElementById('filterCategory');
    var filterMember = document.getElementById('filterMember');
    var filterDateFrom = document.getElementById('filterDateFrom');
    var filterDateTo = document.getElementById('filterDateTo');

    if (filterCategory) {
      filterCategory.addEventListener('change', function () {
        applyFilters();
        renderExpenses();
      });
    }
    if (filterMember) {
      filterMember.addEventListener('change', function () {
        applyFilters();
        renderExpenses();
      });
    }
    if (filterDateFrom) {
      filterDateFrom.addEventListener('change', function () {
        applyFilters();
        renderExpenses();
      });
    }
    if (filterDateTo) {
      filterDateTo.addEventListener('change', function () {
        applyFilters();
        renderExpenses();
      });
    }

    // Add Expense Modal
    var btnAddExpense = document.getElementById('btnAddExpense');
    var addExpenseModal = document.getElementById('addExpenseModal');
    var addExpenseClose = document.getElementById('addExpenseClose');
    var addExpenseCancel = document.getElementById('addExpenseCancel');
    var addExpenseSubmit = document.getElementById('addExpenseSubmit');

    if (btnAddExpense) {
      btnAddExpense.addEventListener('click', function () {
        if (addExpenseModal) {
          addExpenseModal.style.display = 'flex';
          resetAddExpenseForm();
          setTimeout(function () {
            fixFormLabels(addExpenseModal);
          }, 50);
        }
      });
    }

    if (addExpenseClose) {
      addExpenseClose.addEventListener('click', function () {
        if (addExpenseModal) addExpenseModal.style.display = 'none';
      });
    }

    if (addExpenseCancel) {
      addExpenseCancel.addEventListener('click', function () {
        if (addExpenseModal) addExpenseModal.style.display = 'none';
      });
    }

    // Split type buttons
    var splitTypeBtns = document.querySelectorAll('.split-type-btn');
    var expenseSplitTypeInput = document.getElementById('expenseSplitType');
    splitTypeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        splitTypeBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var split = btn.dataset.split || 'equal';
        if (expenseSplitTypeInput) expenseSplitTypeInput.value = split;
        var customSplitsWrap = document.getElementById('customSplitsWrap');
        if (customSplitsWrap) {
          customSplitsWrap.style.display = (split === 'exact' || split === 'percent' || split === 'shares') ? 'block' : 'none';
          if (split === 'exact' || split === 'percent' || split === 'shares') {
            renderCustomSplits();
          }
        }
      });
    });

    // Split between: hide error when at least one selected
    var splitMembersListEl = document.getElementById('splitMembersList');
    if (splitMembersListEl) {
      splitMembersListEl.addEventListener('change', function () {
        var checked = document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked').length;
        var splitMembersError = document.getElementById('splitMembersError');
        if (splitMembersError) splitMembersError.style.display = checked > 0 ? 'none' : 'flex';
      });
    }

    // Receipt upload zone click
    var receiptZone = document.getElementById('expenseReceiptZone');
    var expenseBillFileInput = document.getElementById('expenseBillFile');
    if (receiptZone && expenseBillFileInput) {
      receiptZone.addEventListener('click', function (e) {
        if (e.target !== expenseBillFileInput) expenseBillFileInput.click();
      });
    }

    // Custom splits input
    var expenseAmount = document.getElementById('expenseAmount');
    if (expenseAmount) {
      expenseAmount.addEventListener('input', function () {
        updateCustomSplits();
      });
    }

    // Fix labels when date inputs change
    var expenseDate = document.getElementById('expenseDate');
    if (expenseDate) {
      expenseDate.addEventListener('change', function () {
        fixFormLabels(addExpenseModal);
      });
    }

    // Fix labels when selects change
    if (addExpenseModal) {
      addExpenseModal.querySelectorAll('select').forEach(function (select) {
        select.addEventListener('change', function () {
          fixFormLabels(addExpenseModal);
        });
      });
    }

    // Fix labels in settle modal
    if (settlePaymentModal) {
      var settleDate = document.getElementById('settleDate');
      if (settleDate) {
        settleDate.addEventListener('change', function () {
          fixFormLabels(settlePaymentModal);
        });
      }
      settlePaymentModal.querySelectorAll('select').forEach(function (select) {
        select.addEventListener('change', function () {
          fixFormLabels(settlePaymentModal);
        });
      });
    }

    // Add Expense Submit
    if (addExpenseSubmit) {
      addExpenseSubmit.addEventListener('click', function () {
        submitExpense();
      });
    }

    // Settle Up button
    var btnSettleUp = document.getElementById('btnSettleUp');
    var settlePaymentModal = document.getElementById('settlePaymentModal');
    var settlePaymentClose = document.getElementById('settlePaymentClose');
    var settlePaymentCancel = document.getElementById('settlePaymentCancel');
    var settlePaymentSubmit = document.getElementById('settlePaymentSubmit');

    if (btnSettleUp) {
      btnSettleUp.addEventListener('click', function () {
        if (settlePaymentModal) {
          settlePaymentModal.style.display = 'flex';
          resetSettleForm();
          setTimeout(function () {
            fixFormLabels(settlePaymentModal);
          }, 50);
        }
      });
    }

    if (settlePaymentClose) {
      settlePaymentClose.addEventListener('click', function () {
        if (settlePaymentModal) settlePaymentModal.style.display = 'none';
      });
    }

    if (settlePaymentCancel) {
      settlePaymentCancel.addEventListener('click', function () {
        if (settlePaymentModal) settlePaymentModal.style.display = 'none';
      });
    }

    if (settlePaymentSubmit) {
      settlePaymentSubmit.addEventListener('click', function () {
        submitSettlement();
      });
    }
  }

  function showFilterPanel() {
    var filterPanel = document.getElementById('filterPanel');
    var categoryFilter = document.getElementById('categoryFilter');
    var memberFilter = document.getElementById('memberFilter');
    var dateFilter = document.getElementById('dateFilter');

    if (!filterPanel) return;

    categoryFilter.style.display = 'none';
    memberFilter.style.display = 'none';
    dateFilter.style.display = 'none';

    if (currentFilter === 'all') {
      filterPanel.style.display = 'none';
    } else {
      filterPanel.style.display = 'block';
      if (currentFilter === 'category' && categoryFilter) categoryFilter.style.display = 'flex';
      if (currentFilter === 'member' && memberFilter) memberFilter.style.display = 'flex';
      if (currentFilter === 'date' && dateFilter) dateFilter.style.display = 'flex';
    }
  }

  // Utility function to fix form labels
  function fixFormLabels(container) {
    if (!container) container = document;
    
    // Fix date inputs with floating labels
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

    // Fix selects - ensure labels are positioned correctly (above, not floating)
    container.querySelectorAll('select').forEach(function (select) {
      var formGroup = select.closest('.form-group');
      if (formGroup) {
        var label = formGroup.querySelector('label:not([for])');
        if (label) {
          // Regular label (not floating) - ensure it's above
          label.style.position = 'static';
          label.style.display = 'block';
          label.style.marginBottom = '0.5rem';
          label.style.marginTop = '0';
          label.style.top = 'auto';
          label.style.left = 'auto';
          label.style.fontSize = 'var(--font-size-sm)';
          label.style.fontWeight = 'var(--font-weight-medium)';
          label.style.color = 'var(--text)';
          label.style.background = 'transparent';
          label.style.padding = '0';
        }
      }
    });

    // Fix file inputs - ensure labels are above
    container.querySelectorAll('input[type="file"]').forEach(function (input) {
      var formGroup = input.closest('.form-group');
      if (formGroup) {
        var label = formGroup.querySelector('label:not([for])');
        if (label) {
          label.style.position = 'static';
          label.style.display = 'block';
          label.style.marginBottom = '0.5rem';
          label.style.marginTop = '0';
          label.style.top = 'auto';
          label.style.left = 'auto';
          label.style.fontSize = 'var(--font-size-sm)';
          label.style.fontWeight = 'var(--font-weight-medium)';
          label.style.color = 'var(--text)';
          label.style.background = 'transparent';
          label.style.padding = '0';
        }
      }
    });
  }

  function resetAddExpenseForm() {
    var expenseTitle = document.getElementById('expenseTitle');
    var expenseAmount = document.getElementById('expenseAmount');
    var expenseCategory = document.getElementById('expenseCategory');
    var expensePaidBy = document.getElementById('expensePaidBy');
    var expenseDate = document.getElementById('expenseDate');
    var expenseBillUrl = document.getElementById('expenseBillUrl');
    var expenseBillFile = document.getElementById('expenseBillFile');
    var addExpenseError = document.getElementById('addExpenseError');
    var expenseSplitTypeInput = document.getElementById('expenseSplitType');
    var splitMembersError = document.getElementById('splitMembersError');

    if (expenseTitle) expenseTitle.value = '';
    if (expenseAmount) expenseAmount.value = '0';
    if (expenseCategory) expenseCategory.value = 'other';
    if (expensePaidBy && expensePaidBy.options.length > 0) {
      expensePaidBy.value = currentUser.id || expensePaidBy.options[1] ? expensePaidBy.options[1].value : '';
    }
    if (expenseDate) {
      var today = new Date().toISOString().split('T')[0];
      expenseDate.value = today;
    }
    if (expenseBillUrl) expenseBillUrl.value = '';
    if (expenseBillFile) expenseBillFile.value = '';
    if (addExpenseError) addExpenseError.style.display = 'none';
    if (splitMembersError) splitMembersError.style.display = 'none';
    if (expenseSplitTypeInput) expenseSplitTypeInput.value = 'equal';

    var equalBtn = document.querySelector('.split-type-btn[data-split="equal"]');
    if (equalBtn) {
      document.querySelectorAll('.split-type-btn').forEach(function (b) { b.classList.remove('active'); });
      equalBtn.classList.add('active');
    }
    var customSplitsWrap = document.getElementById('customSplitsWrap');
    if (customSplitsWrap) customSplitsWrap.style.display = 'none';

    var splitCheckboxes = document.querySelectorAll('#splitMembersList input[type="checkbox"]');
    splitCheckboxes.forEach(function (cb) { cb.checked = true; });

    setTimeout(function () {
      var modal = document.getElementById('addExpenseModal');
      if (modal) fixFormLabels(modal);
    }, 10);
  }

  function renderCustomSplits() {
    var customSplitsList = document.getElementById('customSplitsList');
    if (!customSplitsList) return;

    customSplitsList.innerHTML = '';
    var checkedMembers = Array.from(document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked'));
    
    checkedMembers.forEach(function (checkbox) {
      var userId = checkbox.value;
      var member = allMembers.find(function (m) { return m.userId === userId; });
      var name = member ? (member.displayName || member.email || userId.slice(0, 8)) : userId.slice(0, 8);

      var item = document.createElement('div');
      item.className = 'custom-split-item';
      var label = document.createElement('label');
      label.textContent = name + ':';
      var input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.min = '0';
      input.dataset.userId = userId;
      input.addEventListener('input', updateSplitTotal);

      item.appendChild(label);
      item.appendChild(input);
      customSplitsList.appendChild(item);
    });
  }

  function updateCustomSplits() {
    var amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    var checkedMembers = Array.from(document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked'));
    var perPerson = checkedMembers.length > 0 ? Math.round((amount / checkedMembers.length) * 100) / 100 : 0;

    var customSplitsList = document.getElementById('customSplitsList');
    if (customSplitsList) {
      var inputs = customSplitsList.querySelectorAll('input');
      inputs.forEach(function (input) {
        if (!input.value) {
          input.value = perPerson.toFixed(2);
        }
      });
    }

    updateSplitTotal();
  }

  function updateSplitTotal() {
    var splitTotalAmount = document.getElementById('splitTotalAmount');
    var splitTotal = document.getElementById('splitTotal');
    if (!splitTotalAmount || !splitTotal) return;

    var inputs = document.querySelectorAll('#customSplitsList input');
    var total = 0;
    inputs.forEach(function (input) {
      total += parseFloat(input.value) || 0;
    });

    var expenseAmount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    splitTotalAmount.textContent = total.toFixed(2);
    
    if (Math.abs(total - expenseAmount) > 0.01) {
      splitTotal.classList.add('error');
    } else {
      splitTotal.classList.remove('error');
    }
  }

  function submitExpense() {
    var errEl = document.getElementById('addExpenseError');
    var title = document.getElementById('expenseTitle').value.trim();
    var amount = parseFloat(document.getElementById('expenseAmount').value);
    var category = document.getElementById('expenseCategory').value;
    var paidBy = document.getElementById('expensePaidBy').value;
    var expenseDate = document.getElementById('expenseDate').value;
    var billImageUrl = document.getElementById('expenseBillUrl').value.trim() || null;
    var fileInput = document.getElementById('expenseBillFile');
    var splitTypeEl = document.getElementById('expenseSplitType');
    var splitType = (splitTypeEl && splitTypeEl.value) || (document.querySelector('.split-type-btn.active') && document.querySelector('.split-type-btn.active').dataset.split) || 'equal';
    if (splitType !== 'equal') splitType = 'custom';
    var checkedMembers = Array.from(document.querySelectorAll('#splitMembersList input[type="checkbox"]:checked'));

    if (errEl) errEl.style.display = 'none';

    if (!title) {
      if (errEl) {
        errEl.textContent = 'Enter expense title.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      if (errEl) {
        errEl.textContent = 'Enter a valid amount.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (!paidBy) {
      if (errEl) {
        errEl.textContent = 'Select who paid for this expense.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (checkedMembers.length === 0) {
      var splitErr = document.getElementById('splitMembersError');
      if (splitErr) splitErr.style.display = 'flex';
      if (errEl) {
        errEl.textContent = 'Select at least one member to split with.';
        errEl.style.display = 'block';
      }
      return;
    }
    var splitErr = document.getElementById('splitMembersError');
    if (splitErr) splitErr.style.display = 'none';

    // Get selected members for splitting
    var splitBetween = checkedMembers.map(function (cb) { return cb.value; });

    var body = {
      amount: amount,
      description: title,
      category: category,
      paidBy: paidBy,
      splitType: splitType === 'equal' ? 'equal' : 'custom',
      splitBetween: splitBetween
    };

    if (splitType === 'custom') {
      var customSplits = {};
      var inputs = document.querySelectorAll('#customSplitsList input');
      var total = 0;
      inputs.forEach(function (input) {
        var userId = input.dataset.userId;
        var amt = parseFloat(input.value) || 0;
        customSplits[userId] = amt;
        total += amt;
      });

      if (Math.abs(total - amount) > 0.01) {
        if (errEl) {
          errEl.textContent = 'Custom splits must sum to expense amount.';
          errEl.style.display = 'block';
        }
        return;
      }

      body.customSplits = customSplits;
    }

    if (billImageUrl) body.billImageUrl = billImageUrl;
    if (expenseDate) body.createdAt = new Date(expenseDate).toISOString();

    function submit(body) {
      FairHiveAPI.post('/rooms/' + room.id + '/expenses', body).then(function () {
        if (addExpenseModal) addExpenseModal.style.display = 'none';
        loadExpenses();
      }).catch(function (err) {
        if (errEl) {
          errEl.textContent = (err.body && err.body.error) || 'Failed to add expense';
          errEl.style.display = 'block';
        }
      });
    }

    if (fileInput && fileInput.files && fileInput.files[0]) {
      uploadFile(fileInput.files[0], function (err, url) {
        if (err) {
          if (errEl) {
            errEl.textContent = 'Upload failed';
            errEl.style.display = 'block';
          }
          return;
        }
        body.billImageUrl = url;
        submit(body);
      });
    } else {
      submit(body);
    }
  }

  function uploadFile(file, done) {
    var form = new FormData();
    form.append('file', file);
    var token = FairHiveAuth.getToken();
    fetch(FairHiveAPI.baseURL + '/upload', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: form
    }).then(function (r) { return r.json(); }).then(function (data) { done(null, data.url); }).catch(function (e) { done(e); });
  }

  function resetSettleForm() {
    var settleFrom = document.getElementById('settleFrom');
    var settleTo = document.getElementById('settleTo');
    var settleAmount = document.getElementById('settleAmount');
    var settlePaymentMode = document.getElementById('settlePaymentMode');
    var settleDate = document.getElementById('settleDate');
    var settlePaymentError = document.getElementById('settlePaymentError');

    if (settleFrom) settleFrom.value = '';
    if (settleTo) settleTo.value = '';
    if (settleAmount) settleAmount.value = '';
    if (settlePaymentMode) settlePaymentMode.value = '';
    if (settleDate) {
      var today = new Date().toISOString().split('T')[0];
      settleDate.value = today;
    }
    if (settlePaymentError) settlePaymentError.style.display = 'none';
  }

  function submitSettlement() {
    var errEl = document.getElementById('settlePaymentError');
    var from = document.getElementById('settleFrom').value;
    var to = document.getElementById('settleTo').value;
    var amount = parseFloat(document.getElementById('settleAmount').value);

    if (errEl) errEl.style.display = 'none';

    if (!from || !to) {
      if (errEl) {
        errEl.textContent = 'Select both "From" and "To" members.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (from === to) {
      if (errEl) {
        errEl.textContent = 'From and To cannot be the same person.';
        errEl.style.display = 'block';
      }
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      if (errEl) {
        errEl.textContent = 'Enter a valid amount.';
        errEl.style.display = 'block';
      }
      return;
    }

    // For now, settlement is handled by marking splits as paid
    // In a full implementation, you'd create a settlement record
    // For this demo, we'll just show a success message
    alert('Settlement recorded! In a full implementation, this would update balances.');
    
    var settlePaymentModal = document.getElementById('settlePaymentModal');
    if (settlePaymentModal) settlePaymentModal.style.display = 'none';
    loadExpenses();
  }

  // Initialize on page load
  init();
})();

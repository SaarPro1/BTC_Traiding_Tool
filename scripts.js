// === Konfiguration ===
const MARKET = "BTC-EUR";
const CANDLE_INTERVAL = "1m"; // 1m, 5m, 1h, ...
const REST_CANDLES_URL = `https://api.bitvavo.com/v2/${MARKET}/candles?interval=${CANDLE_INTERVAL}`;
const WS_URL = "wss://ws.bitvavo.com/v2/";

// === DOM Elemente ===
const priceEl = document.getElementById("currentPrice");
const wsStatusEl = document.getElementById("wsStatus");
const alarmInputEl = document.getElementById("alarmInput");
const alarmStatusEl = document.getElementById("alarmStatus");
const setAlarmBtn = document.getElementById("setAlarmBtn");
const chartCanvas = document.getElementById("btcChart");
document.getElementById("currentPrice").textContent =
  `Bid: ${bid.toFixed(2)} € | Ask: ${ask.toFixed(2)} €`;


// === State ===
let btcChart = null;
let currentPrice = null;
let alarmPrice = null;
let ws = null;

// === 1) Candles via REST laden und Chart zeichnen ===
async function loadCandles() {
  try {
    const res = await fetch(REST_CANDLES_URL);
    const data = await res.json();

    // Bitvavo liefert neu → alt, wir wollen alt → neu
    const candles = data.reverse();

    const labels = candles.map((c) =>
      new Date(c[0]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    );
    const prices = candles.map((c) => parseFloat(c[4])); // close

    return { labels, prices };
  } catch (err) {
    console.error("Fehler beim Laden der Candles:", err);
    return { labels: [], prices: [] };
  }
}

async function initChart() {
  const { labels, prices } = await loadCandles();

  const ctx = chartCanvas.getContext("2d");

  btcChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "BTC/EUR (Close)",
          data: prices,
          borderColor: "#ffb347",
          backgroundColor: "rgba(255, 179, 71, 0.18)",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
          },
        },
        y: {
          beginAtZero: false,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}

// === 2) WebSocket für Live‑Preis ===
function initWebSocket() {
  wsStatusEl.textContent = "WebSocket: Verbinde…";
  wsStatusEl.classList.remove("ok", "error");

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    wsStatusEl.textContent = "WebSocket: Verbunden";
    wsStatusEl.classList.add("ok");
  }
    // Auf Ticker‑Channel für BTC-EUR subscriben
    const msg = {
      action: "subscribe",
      channels: [
        {
          name: "ticker",
          markets: ["BTC-EUR"],
        },
      ],
    };
    ws.send(JSON.stringify(msg));
  };


ws.onmessage = (event) =>{ 
    console.log("EVENT:", event.data);
}




  ws.onerror = (err) => {
    console.error("WebSocket Fehler:", err);
    wsStatusEl.textContent = "WebSocket: Fehler";
    wsStatusEl.classList.remove("ok");
    wsStatusEl.classList.add("error");
  };

  ws.onclose = () => {
    wsStatusEl.textContent = "WebSocket: Getrennt – versuche neu zu verbinden…";
    wsStatusEl.classList.remove("ok");
    wsStatusEl.classList.add("error");

    // Nach kurzer Zeit neu verbinden
    setTimeout(initWebSocket, 4000);
  };


// === 3) Preis & Chart aktualisieren ===
function updatePrice(price) {
  currentPrice = price;
  priceEl.textContent = price.toFixed(2) + " €";

  // Chart updaten: letzten Punkt ersetzen oder neuen hinzufügen
  if (btcChart) {
    const labels = btcChart.data.labels;
    const data = btcChart.data.datasets[0].data;

    const nowLabel = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Wenn letztes Label gleich ist, nur Wert aktualisieren
    if (labels.length > 0 && labels[labels.length - 1] === nowLabel) {
      data[data.length - 1] = price;
    } else {
      labels.push(nowLabel);
      data.push(price);

      // Optional: begrenzen, damit der Chart nicht unendlich wächst
      if (labels.length > 200) {
        labels.shift();
        data.shift();
      }
    }

    btcChart.update("none");
  }

  checkAlarm();
}

// === 4) Preisalarm ===
function setAlarm() {
  const value = parseFloat(alarmInputEl.value);
  if (isNaN(value) || value <= 0) {
    alarmStatusEl.textContent = "Bitte einen gültigen Preis eingeben.";
    alarmStatusEl.classList.remove("ok");
    alarmStatusEl.classList.add("error");
    return;
  }

  alarmPrice = value;
  alarmStatusEl.textContent = `Alarm gesetzt bei ≥ ${alarmPrice.toFixed(2)} €`;
  alarmStatusEl.classList.remove("error");
  alarmStatusEl.classList.add("ok");
}

function checkAlarm() {
  if (!alarmPrice || !currentPrice) return;

  if (currentPrice >= alarmPrice) {
    alarmStatusEl.textContent = `ALARM! BTC hat ${alarmPrice.toFixed(2)} € erreicht oder überschritten.`;
    alarmStatusEl.classList.remove("ok");
    alarmStatusEl.classList.add("error");

    // Visueller Effekt
    document.body.classList.add("alarm-active");
    setTimeout(() => document.body.classList.remove("alarm-active"), 1200);

    // Browser‑Alert (kannst du später durch Sound ersetzen)
    alert(`BTC Preisalarm: ${currentPrice.toFixed(2)} € (Schwelle: ${alarmPrice.toFixed(2)} €)`);

    // Optional: Alarm zurücksetzen
    alarmPrice = null;
  }
}

// === 5) Event Listener ===
setAlarmBtn.addEventListener("click", setAlarm);

// === 6) Init ===
(async function start() {
  await initChart();
  initWebSocket();
})();


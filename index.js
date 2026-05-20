// ==========================================================================
// 1. GLOBALE VARIABLEN (Ganz oben stehen lassen)
// ==========================================================================
let lastPrice = null;
let cryptoChart = null;
let targetAlarmPrice = null; // Für den Alarm
let alarmTriggered = false;  // Für den Alarm

// ==========================================================================
// 2. HAUPTFUNKTION: API-DATEN HOLEN & CHECKEN
// ==========================================================================
async function fetchBtcData() {
    try {
        const response = await fetch('https://api.bitvavo.com/v2/BTC-EUR/candles?interval=1m&limit=60');
        const data = await response.json();

        const closes = data.map(candle => parseFloat(candle[4])).reverse();
        const currentPrice = closes[closes.length - 1];

        // HIER WIRD DER ALARM BEI JEDEM UPDATE GEPRÜFT
        checkPriceAlarm(currentPrice);

        // Preis im HTML anzeigen
        const priceDisplay = document.getElementById('btc-price');
        if (priceDisplay) {
            priceDisplay.innerText = currentPrice.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'EUR'
            });
        }

        // Chart aktualisieren
        updateChart(closes);

        // RSI und MACD berechnen
        const currentRSI = calculateRSI(closes, 14);
        const macdData = calculateMACD(closes);

        // Signal-Box auswerten und färben
        const signalBox = document.getElementById('signal-box');
        if (signalBox) {
            let signalText = '⚪ HALTEN / NEUTRAL';
            let signalColor = '#4a443f';
            let signalBg = '#faf9f6';

            if (currentRSI < 35 && macdData.macd > macdData.signal) {
                signalText = '🟢 KAUFEN (Trend dreht nach oben)';
                signalColor = '#2e5a27';
                signalBg = 'var(--success)';
            } else if (currentRSI > 65 && macdData.macd < macdData.signal) {
                signalText = '🔴 VERKAUFEN (Trend bricht ein)';
                signalColor = '#6b2d2d';
                signalBg = 'var(--danger)';
            }

            signalBox.style.backgroundColor = signalBg;
            signalBox.innerHTML = `
              <div style="color: ${signalColor}; font-weight: bold; font-size: 1.1rem; margin-bottom: 6px;">${signalText}</div>
              <div style="font-size: 0.9rem; color: ${signalColor}; opacity: 0.9;">
                RSI: ${currentRSI.toFixed(1)} | MACD: ${macdData.macd.toFixed(2)} | Signal: ${macdData.signal.toFixed(2)}
              </div>
            `;
        }

        lastPrice = currentPrice;

    } catch (error) {
        console.error("Fehler beim Abrufen der Bitvavo-Daten:", error);
        const priceDisplay = document.getElementById('btc-price');
        if (priceDisplay) priceDisplay.innerText = "API-Fehler";
    }
}

// ==========================================================================
// 3. ALARM LOGIK (Eigenständige Funktionen)
// ==========================================================================
function playAlarmSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, start, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            gainNode.gain.setValueAtTime(0.3, start);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start(start);
            oscillator.stop(start + duration);
        };

        playTone(880, audioCtx.currentTime, 0.15);
        playTone(880, audioCtx.currentTime + 0.2, 0.15);
    } catch (e) {
        console.error("Audio konnte nicht abgespielt werden:", e);
    }
}

function checkPriceAlarm(currentPrice) {
    if (targetAlarmPrice !== null && currentPrice >= targetAlarmPrice) {
        if (!alarmTriggered) {
            playAlarmSound();
            document.body.classList.add('alarm-active');

            const alarmStatus = document.getElementById('alarmStatus');
            if (alarmStatus) {
                alarmStatus.innerText = `🚨 ALARM AUSGELÖST bei ${currentPrice.toLocaleString('de-DE')} €!`;
                alarmStatus.style.color = '#6b2d2d';
            }
            alarmTriggered = true;
        }
    }
}

// Event-Listener für den Button "Alarm setzen"
// Das machen wir fest, sobald das Dokument bereit ist
document.addEventListener('DOMContentLoaded', () => {
    const alarmBtn = document.getElementById('setAlarmBtn');
    if (alarmBtn) {
        alarmBtn.addEventListener('click', () => {
            const inputVal = parseFloat(document.getElementById('alarmInput').value);
            const alarmStatus = document.getElementById('alarmStatus');

            if (!isNaN(inputVal) && inputVal > 0) {
                targetAlarmPrice = inputVal;
                alarmTriggered = false;
                document.body.classList.remove('alarm-active');

                if (alarmStatus) {
                    alarmStatus.innerText = `🔔 Alarm aktiv bei ≥ ${targetAlarmPrice.toLocaleString('de-DE')} €`;
                    alarmStatus.style.color = 'var(--text-main)';
                }
            } else {
                if (alarmStatus) {
                    alarmStatus.innerText = '❌ Bitte gültigen Preis eingeben.';
                    alarmStatus.style.color = 'var(--danger)';
                }
            }
        });
    }
});

// ==========================================================================
// 4. CHART FUNKTION
// ==========================================================================
function updateChart(prices) {
    const ctx = document.getElementById('btcChart').getContext('2d');
    const labels = prices.map((_, index) => index);

    if (cryptoChart) {
        cryptoChart.data.labels = labels;
        cryptoChart.data.datasets[0].data = prices;
        cryptoChart.update();
    } else {
        cryptoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC/EUR (Schlusskurs)',
                    data: prices,
                    borderColor: '#e3a019',
                    backgroundColor: 'rgb(14 7 1 / 0.08)',
                    borderWidth: 4,
                    pointRadius: 6,
                    pointBackgroundColor: '#21138a',
                    lineTension: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('de-DE') + ' €';
                            }
                        }
                    }
                }
            }
        });
    }
}

// ==========================================================================
// 5. MATHEMATISCHE INDIKATOREN
// ==========================================================================
function calculateRSI(prices, period = 14) {
    if (prices.length < period) return 50;
    let gains = 0, losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        let currentGain = diff > 0 ? diff : 0;
        let currentLoss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    const rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calculateMACD(prices) {
    if (prices.length < 26) return { macd: 0, signal: 0 };
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);

    const macdLine = [];
    for (let i = 0; i < prices.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
    }

    const signalLine = calculateEMA(macdLine, 9);

    return {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1]
    };
}

// ==========================================================================
// 6. START-INTERVALL
// ==========================================================================
setInterval(fetchBtcData, 15000);
fetchBtcData();
const WEATHER_CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"], 80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"],
  82: ["Violent showers", "⛈️"], 85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm + hail", "⛈️"], 99: ["Thunderstorm + hail", "⛈️"],
};

const CURRENCIES = ["USD","EUR","GBP","JPY","AUD","CAD","CHF","CNY","INR","SGD","NZD","SEK","NOK","MXN","BRL","ZAR","HKD","KRW"];
const CURRENCY_NAMES = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen",
  AUD: "Australian Dollar", CAD: "Canadian Dollar", CHF: "Swiss Franc",
  CNY: "Chinese Yuan", INR: "Indian Rupee", SGD: "Singapore Dollar",
  NZD: "New Zealand Dollar", SEK: "Swedish Krona", NOK: "Norwegian Krone",
  MXN: "Mexican Peso", BRL: "Brazilian Real", ZAR: "South African Rand",
  HKD: "Hong Kong Dollar", KRW: "South Korean Won",
};
const CURRENCY_FLAGS = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺", CAD: "🇨🇦",
  CHF: "🇨🇭", CNY: "🇨🇳", INR: "🇮🇳", SGD: "🇸🇬", NZD: "🇳🇿", SEK: "🇸🇪",
  NOK: "🇳🇴", MXN: "🇲🇽", BRL: "🇧🇷", ZAR: "🇿🇦", HKD: "🇭🇰", KRW: "🇰🇷",
};

const CACHE_TTL_MS = 60 * 60 * 1000;

const weatherLoading = document.getElementById("weather-loading");
const weatherContent = document.getElementById("weather-content");
const cityForm = document.getElementById("city-form");
const cityInput = document.getElementById("city-input");

const fromSel = document.getElementById("from");
const toSel = document.getElementById("to");
const amountInput = document.getElementById("amount");
const convertBtn = document.getElementById("convert-btn");
const currencyLoading = document.getElementById("currency-loading");
const currencyResult = document.getElementById("currency-result");

let tempChart = null;
let rateChart = null;

/* ---------- Clock ---------- */
function tickClock() {
  const now = new Date();
  const dateEl = document.getElementById("today-date");
  const timeEl = document.getElementById("current-time");
  if (dateEl) dateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  if (timeEl) timeEl.textContent = now.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}
setInterval(tickClock, 1000);
tickClock();

/* ---------- Weather ---------- */
async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  if (!data.results?.length) throw new Error(`City "${name}" not found`);
  return data.results[0];
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.city || data.locality || data.principalSubdivision || "Your location",
      country: data.countryName || "",
    };
  } catch {
    return null;
  }
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&hourly=temperature_2m` +
    `&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

function renderWeather(place, data) {
  const current = data.current;
  const [condition, icon] = WEATHER_CODES[current.weather_code] || ["Unknown", "❓"];

  document.getElementById("weather-temp").textContent = Math.round(current.temperature_2m);
  document.getElementById("weather-icon").textContent = icon;
  document.getElementById("weather-location").textContent =
    `${place.name}${place.country ? ", " + place.country : ""}`;
  document.getElementById("weather-condition").textContent = condition;
  document.getElementById("weather-wind").textContent = `${current.wind_speed_10m} km/h`;
  document.getElementById("weather-humidity").textContent = `${current.relative_humidity_2m}%`;
  document.getElementById("weather-feels").textContent = `${Math.round(current.apparent_temperature)}°C`;

  const forecast = document.getElementById("forecast");
  forecast.innerHTML = "";
  const days = data.daily.time;
  for (let i = 0; i < days.length; i++) {
    const [cond, ico] = WEATHER_CODES[data.daily.weather_code[i]] || ["", "❓"];
    const date = new Date(days[i]);
    const label = i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" });

    const el = document.createElement("div");
    el.className = "day" + (i === 0 ? " active" : "");
    el.innerHTML = `
      <div class="label">${label}</div>
      <span class="icon" title="${cond}">${ico}</span>
      <div class="hi">${Math.round(data.daily.temperature_2m_max[i])}°</div>
      <div class="lo">${Math.round(data.daily.temperature_2m_min[i])}°</div>
    `;
    forecast.appendChild(el);
  }

  renderTempChart(data);

  weatherLoading.classList.add("hidden");
  weatherContent.classList.remove("hidden");
}

function renderTempChart(data) {
  const canvas = document.getElementById("temp-chart");
  if (!canvas || typeof Chart === "undefined") return;

  const hours = data.hourly.time;
  const temps = data.hourly.temperature_2m;

  const labels = hours.map((t, i) => {
    const d = new Date(t);
    return i % 6 === 0
      ? d.toLocaleDateString(undefined, { weekday: "short" }) + " " +
        d.getHours().toString().padStart(2, "0") + ":00"
      : "";
  });

  if (tempChart) tempChart.destroy();

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
  gradient.addColorStop(0, "rgba(56,189,248,0.45)");
  gradient.addColorStop(1, "rgba(56,189,248,0.02)");

  tempChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: temps,
        borderColor: "#38bdf8",
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#38bdf8",
        borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.95)",
          borderColor: "rgba(56,189,248,0.4)",
          borderWidth: 1,
          padding: 10,
          titleColor: "#eef2ff",
          bodyColor: "#94a3b8",
          callbacks: {
            title: (items) => {
              const i = items[0].dataIndex;
              return new Date(hours[i]).toLocaleString(undefined, {
                weekday: "short", hour: "2-digit", minute: "2-digit",
              });
            },
            label: (item) => `${item.parsed.y.toFixed(1)}°C`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#94a3b8", font: { size: 10 }, maxTicksLimit: 6 },
          grid: { color: "rgba(148,163,184,0.12)" },
        },
      },
    },
  });
}

async function loadWeather(city) {
  weatherLoading.textContent = "Loading weather…";
  weatherLoading.classList.remove("hidden", "error");
  weatherContent.classList.add("hidden");
  try {
    const place = await geocodeCity(city);
    const data = await fetchWeather(place.latitude, place.longitude);
    renderWeather(place, data);
  } catch (err) {
    weatherLoading.textContent = `⚠️ ${err.message}`;
    weatherLoading.classList.add("error");
  }
}

async function initWeather() {
  if (!navigator.geolocation) return loadWeather("London");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const [data, place] = await Promise.all([
          fetchWeather(latitude, longitude),
          reverseGeocode(latitude, longitude),
        ]);
        renderWeather(place || { name: "Your location", country: "" }, data);
      } catch {
        loadWeather("London");
      }
    },
    () => loadWeather("London"),
    { timeout: 5000 }
  );
}

/* ---------- Currency ---------- */
function populateSelects() {
  for (const code of CURRENCIES) {
    const label = `${code} — ${CURRENCY_NAMES[code] || code}`;
    fromSel.add(new Option(label, code));
    toSel.add(new Option(label, code));
  }
  fromSel.value = "USD";
  toSel.value = "EUR";
  updateFlagLabels();
}

function updateFlagLabels() {
  document.getElementById("from-flag").textContent = CURRENCY_FLAGS[fromSel.value] || "🏳️";
  document.getElementById("to-flag").textContent = CURRENCY_FLAGS[toSel.value] || "🏳️";
}

function getCachedRate(from, to) {
  try {
    const raw = localStorage.getItem(`fx:${from}:${to}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function setCachedRate(from, to, rate, date) {
  try {
    localStorage.setItem(`fx:${from}:${to}`, JSON.stringify({ rate, date, ts: Date.now() }));
  } catch {}
}

async function convert() {
  const amount = parseFloat(amountInput.value) || 0;
  const from = fromSel.value;
  const to = toSel.value;

  updateFlagLabels();

  document.getElementById("result-from-amount").textContent = amount.toLocaleString();
  document.getElementById("result-from-code").textContent = from;
  document.getElementById("result-from-name").textContent = CURRENCY_NAMES[from] || from;
  document.getElementById("result-from-flag").textContent = CURRENCY_FLAGS[from] || "🏳️";
  document.getElementById("result-to-flag").textContent = CURRENCY_FLAGS[to] || "🏳️";
  document.getElementById("result-to-name").textContent = CURRENCY_NAMES[to] || to;
  document.getElementById("result-currency").textContent = to;

  const fetchingEl = document.getElementById("fetching-text");

  if (from === to) {
    document.getElementById("result-amount").textContent = amount.toFixed(2);
    document.getElementById("rate-from").textContent = from;
    document.getElementById("rate-value").textContent = "1.0000";
    document.getElementById("rate-to").textContent = to;
    document.getElementById("rate-date").textContent = new Date().toLocaleString();
    if (fetchingEl) fetchingEl.style.visibility = "hidden";
    renderRateHistory(from, to);
    return;
  }

  if (fetchingEl) {
    fetchingEl.style.visibility = "visible";
    fetchingEl.innerHTML = `<span class="spinner"></span> Fetching rate…`;
  }

  try {
    let rate, date;
    const cached = getCachedRate(from, to);

    if (cached) {
      rate = cached.rate;
      date = cached.date;
    } else {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Failed to fetch rate");
      const data = await res.json();
      rate = data.rates[to];
      date = data.date;
      setCachedRate(from, to, rate, date);
    }

    const converted = amount * rate;

    document.getElementById("result-amount").textContent = converted.toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    document.getElementById("rate-from").textContent = from;
    document.getElementById("rate-value").textContent = rate.toFixed(4);
    document.getElementById("rate-to").textContent = to;

    const now = new Date();
    document.getElementById("rate-date").textContent =
      now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) +
      ", " + now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) +
      (cached ? " (cached)" : "");

    if (fetchingEl) fetchingEl.style.visibility = "hidden";

    renderRateHistory(from, to);
  } catch (err) {
    if (fetchingEl) {
      fetchingEl.innerHTML = `⚠️ ${err.message}`;
      fetchingEl.style.color = "#f87171";
    }
  }
}

async function renderRateHistory(from, to) {
  const canvas = document.getElementById("rate-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (from === to) {
    if (rateChart) { rateChart.destroy(); rateChart = null; }
    return;
  }

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);

  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=${from}&to=${to}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const dates = Object.keys(data.rates).sort();
    const values = dates.map((d) => data.rates[d][to]);

    if (rateChart) rateChart.destroy();

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 150);
    gradient.addColorStop(0, "rgba(250,204,21,0.35)");
    gradient.addColorStop(1, "rgba(250,204,21,0.02)");

    rateChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          data: values,
          borderColor: "#facc15",
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: "#facc15",
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            intersect: false,
            mode: "index",
            backgroundColor: "rgba(15,23,42,0.95)",
            borderColor: "rgba(250,204,21,0.4)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (item) => `1 ${from} = ${item.parsed.y.toFixed(4)} ${to}`,
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            ticks: { color: "#94a3b8", maxTicksLimit: 4, font: { size: 10 } },
            grid: { color: "rgba(148,163,184,0.1)" },
          },
        },
      },
    });
  } catch {}
}

/* ---------- Events ---------- */
cityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) loadWeather(city);
});

convertBtn.addEventListener("click", convert);
amountInput.addEventListener("keydown", (e) => { if (e.key === "Enter") convert(); });
fromSel.addEventListener("change", convert);
toSel.addEventListener("change", convert);

document.getElementById("clear-cache").addEventListener("click", () => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("fx:"))
    .forEach((k) => localStorage.removeItem(k));
  convert();
});

/* ---------- Init ---------- */
populateSelects();
convert();
initWeather();
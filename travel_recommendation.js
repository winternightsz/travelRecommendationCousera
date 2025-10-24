// ======= Config =======
const API_URL = "./travel_recommendation_api.json";

// Optional: map a country to an IANA timezone for Task 10 (optional)
const COUNTRY_TZ = {
  australia: "Australia/Sydney",
  japan: "Asia/Tokyo",
  brazil: "America/Sao_Paulo",
};

// ======= DOM =======
const input = document.getElementById("search-input");
const btnSearch = document.getElementById("btn-search");
const btnClear = document.getElementById("btn-clear");
const grid = document.getElementById("results-grid");
const countryTime = document.getElementById("country-time");

// ======= Utils =======
const toKey = (s) => (s || "").toString().trim().toLowerCase();

function timeForCountry(countryKey) {
  const tz = COUNTRY_TZ[countryKey];
  if (!tz) return "";
  const opts = { timeZone: tz, hour12: true, hour: "numeric", minute: "numeric", second: "numeric" };
  return new Date().toLocaleTimeString("en-US", opts);
}

function setCountryClock(countryKey) {
  if (!countryTime) return;
  if (!COUNTRY_TZ[countryKey]) { countryTime.textContent = ""; return; }
  const label = countryKey[0].toUpperCase() + countryKey.slice(1);
  countryTime.textContent = `Local time in ${label}: ${timeForCountry(countryKey)}`;
}

// ======= Render =======
function renderCards(items = []) {
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<div class="card"><div class="card__body"><div class="card__title">No results</div><p class="muted">Try keywords like <em>beaches</em>, <em>temples</em>, or a country (e.g., <em>Japan</em>).</p></div></div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    const img = document.createElement("img");
    img.src = item.imageUrl;
    img.alt = item.name;
    const body = document.createElement("div");
    body.className = "card__body";
    const title = document.createElement("div");
    title.className = "card__title";
    title.textContent = item.name;
    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = item.description;

    body.appendChild(title);
    body.appendChild(desc);
    card.appendChild(img);
    card.appendChild(body);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

// ======= Search Logic =======
async function fetchData() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to load API JSON");
  return res.json();
}

function normalizePlural(keyword) {
  // beaches -> beach, temples -> temple
  if (keyword.endsWith("es")) return keyword.slice(0, -2);
  if (keyword.endsWith("s")) return keyword.slice(0, -1);
  return keyword;
}

async function search() {
  const qRaw = toKey(input?.value);
  const q = normalizePlural(qRaw);

  // Reset country clock unless we set it later
  setCountryClock("");

  try {
    const data = await fetchData();
    const results = [];

    // Category keywords
    const isBeach = ["beach"].includes(q);
    const isTemple = ["temple"].includes(q);

    if (isBeach && Array.isArray(data.beaches)) {
      results.push(...data.beaches.slice(0, 6)); // at least two
    } else if (isTemple && Array.isArray(data.temples)) {
      results.push(...data.temples.slice(0, 6));
    } else {
      // Search by country/city name (countries -> cities)
      const matchCountry = (data.countries || []).find(
        (c) => toKey(c.name) === q || toKey(c.name).includes(q)
      );
      if (matchCountry) {
        // Optional clock
        setCountryClock(toKey(matchCountry.name));
        // Show at least two cities
        results.push(...(matchCountry.cities || []).slice(0, 6));
      } else {
        // Fallback: fuzzy-ish includes across all
        // Cities inside countries
        (data.countries || []).forEach((c) => {
          (c.cities || []).forEach((city) => {
            const nameKey = toKey(city.name);
            if (nameKey.includes(q)) results.push(city);
          });
        });
        // Temples & Beaches by name/description
        (data.temples || []).forEach((t) => {
          const k = toKey(`${t.name} ${t.description}`);
          if (k.includes(q)) results.push(t);
        });
        (data.beaches || []).forEach((b) => {
          const k = toKey(`${b.name} ${b.description}`);
          if (k.includes(q)) results.push(b);
        });
      }
    }

    renderCards(results);
  } catch (err) {
    console.error(err);
    renderCards([]);
  }
}

function clearResults() {
  if (input) input.value = "";
  setCountryClock("");
  renderCards([]);
}

// ======= Events =======
btnSearch?.addEventListener("click", search);
btnClear?.addEventListener("click", clearResults);

// Optional: allow Enter key to trigger search
input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    search();
  }
});

// First load shows empty state
renderCards([]);

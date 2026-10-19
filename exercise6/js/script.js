const SOURCE_URL = "source/kino-hviezda.html";

async function loadCinemaHtml() {
    const response = await fetch(SOURCE_URL);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.text();
}


function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
}

function cleanText(text) {
    return text.replace(/\s+/g, " ").trim();
}

function parsePrice(text) {
    if (!text) {
        return null;
    }

    const price = parseFloat(text.replace(",", "."));
    return Number.isNaN(price) ? null : price;
}

function parseCinema(doc) {
    const days = [];

    for (const section of doc.querySelectorAll(".den")) {
        const heading = section.querySelector("h2");
        const screenings = [];

        for (const film of section.querySelectorAll(".film")) {
            const time = cleanText(
                film.querySelector(".cas")?.textContent ?? ""
            );
            const title = cleanText(
                film.querySelector(".nazov")?.textContent ?? ""
            );

            if (!time || !title) {
                console.warn("Skipping incomplete screening:", film);
                continue;
            }

            screenings.push({
                time,
                title,
                hall: cleanText(
                    film.querySelector(".sala")?.textContent ?? ""
                ),
                price: parsePrice(
                    film.querySelector(".cena")?.textContent
                ),
            });
        }

        days.push({
            day: cleanText(heading.firstChild.textContent),
            date: cleanText(
                heading.querySelector("small")?.textContent ?? ""
            ),
            screenings,
        });
    }

    return days;
}

function loadCinemaHtmlJquery() {
    return $.ajax({
        url: SOURCE_URL,
        dataType: "text",
    });
}

function parseCinemaJquery(doc) {
    const days = [];

    $(doc).find(".den").each((index, section) => {
        const $section = $(section);
        const screenings = [];

        $section.find(".film").each((index, film) => {
            const $film = $(film);
            const time = cleanText($film.find(".cas").text());
            const title = cleanText($film.find(".nazov").text());

            if (!time || !title) {
                console.warn("Skipping incomplete screening:", film);
                return;
            }

            screenings.push({
                time,
                title,
                hall: cleanText($film.find(".sala").text()),
                price: parsePrice($film.find(".cena").text()),
            });
        });

        days.push({
            day: cleanText(
                $section.find("h2").contents().first().text()
            ),
            date: cleanText($section.find("h2 small").text()),
            screenings,
        });
    });

    return days;
}

const DAY_NAMES = [
    "Pondelok", "Utorok", "Streda", "Štvrtok",
    "Piatok", "Sobota", "Nedeľa"
];

const statusText = document.getElementById("status");
const refreshButton = document.getElementById("refresh");
const tabs = document.getElementById("day-tabs");
const schedule = document.getElementById("schedule");

let program = [];
let selectedDay = 0;

function renderTabs() {
    tabs.replaceChildren();

    program.forEach((day, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = day.day;
        button.setAttribute("aria-pressed", index === selectedDay);

        button.addEventListener("click", () => {
            selectedDay = index;
            render();
        });

        tabs.append(button);
    });
}

function renderDay() {
    schedule.replaceChildren();

    const day = program[selectedDay];

    if (!day) {
        return;
    }

    const heading = document.createElement("h2");
    heading.textContent = `${day.day} ${day.date}`;
    schedule.append(heading);

    if (day.screenings.length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
            "Na tento deň nie je v programe žiadne predstavenie.";
        schedule.append(empty);
        return;
    }

    const list = document.createElement("ul");

    for (const screening of day.screenings) {
        const item = document.createElement("li");

        const price = screening.price === null
            ? "cena neuvedená"
            : `${screening.price.toFixed(2)} €`;

        item.textContent =
            `${screening.time} · ${screening.title} · ` +
            `${screening.hall} · ${price}`;

        list.append(item);
    }

    schedule.append(list);
}

function render() {
    renderTabs();
    renderDay();
}

function getTodayIndex() {
    const todayName = DAY_NAMES[(new Date().getDay() + 6) % 7];
    const index = program.findIndex((day) => day.day === todayName);

    return index === -1 ? 0 : index;
}

async function showProgram(forceRefresh = false) {
    refreshButton.disabled = true;

    try {
        const saved = forceRefresh ? null : loadSavedProgram();

        if (saved) {
            program = saved.days;
            statusText.textContent =
                `Uložený program z ${saved.savedAt.toLocaleString("sk-SK")}.`;
        } else {
            statusText.textContent = "Načítavam program…";

            const html = await loadCinemaHtml();
            const days = parseCinema(parseHtml(html));

            if (days.length === 0) {
                throw new Error(
                    "Na stránke kina sa nenašiel program. " +
                    "Možno sa zmenila jej štruktúra."
                );
            }

            program = days;
            saveProgram(program);

            statusText.textContent =
                `Program aktualizovaný ${new Date().toLocaleString("sk-SK")}.`;
        }

        selectedDay = getTodayIndex();
        render();
    } catch (error) {
        statusText.textContent = error.message;
    } finally {
        refreshButton.disabled = false;
    }
}

const STORAGE_KEY = "cinema-program";
const clearButton = document.getElementById("clear");

function saveProgram(days) {
    const data = {
        savedAt: new Date().toISOString(),
        days,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSavedProgram() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
        return null;
    }

    try {
        const data = JSON.parse(stored);
        const savedAt = new Date(data.savedAt);

        if (
            savedAt.toDateString() !== new Date().toDateString() ||
            !Array.isArray(data.days) ||
            data.days.length === 0
        ) {
            return null;
        }

        return { savedAt, days: data.days };
    } catch {
        return null;
    }
}

refreshButton.addEventListener("click", () => showProgram(true));

clearButton.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    statusText.textContent = "Uložené dáta sú vymazané.";
});

showProgram();
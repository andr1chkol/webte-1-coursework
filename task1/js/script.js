const SEMESTER_START = new Date(2026, 8, 14);
const SEMESTER_END = new Date(2026, 11, 14, 23, 59, 59);

const menuButton = document.querySelector(".site-navigation__toggle");
const menu = document.querySelector(".site-navigation__list");

if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
        const isOpen = menuButton.getAttribute("aria-expanded") === "true";
        menuButton.setAttribute("aria-expanded", String(!isOpen));
        menu.classList.toggle("site-navigation__list--open", !isOpen);
    });
}

const lessons = [...document.querySelectorAll(".lesson")];
const scheduleStatus = document.querySelector("#schedule-status");

function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

function formatLesson(lesson) {
    const subject = lesson.dataset.subject || lesson.querySelector("strong").textContent;
    return `${subject} o ${lesson.dataset.start}`;
}

function updateCurrentLesson() {
    if (!lessons.length || !scheduleStatus) {
        return;
    }

    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();

    const currentLesson = lessons.find((lesson) => {
        return Number(lesson.dataset.day) === day
            && minutes >= timeToMinutes(lesson.dataset.start)
            && minutes <= timeToMinutes(lesson.dataset.end);
    });

    lessons.forEach((lesson) => {
        lesson.classList.toggle("lesson--current", lesson === currentLesson);
    });

    if (currentLesson) {
        scheduleStatus.textContent = `Práve prebieha: ${formatLesson(currentLesson)}.`;
        return;
    }

    const upcomingLessons = lessons.map((lesson) => {
        let daysAhead = Number(lesson.dataset.day) - day;
        if (daysAhead < 0 || (daysAhead === 0 && timeToMinutes(lesson.dataset.start) <= minutes)) {
            daysAhead += 7;
        }

        return {lesson, daysAhead};
    }).sort((first, second) => {
        return first.daysAhead - second.daysAhead
            || timeToMinutes(first.lesson.dataset.start) - timeToMinutes(second.lesson.dataset.start);
    });

    const next = upcomingLessons[0];
    const dayNames = ["nedeľu", "pondelok", "utorok", "stredu", "štvrtok", "piatok", "sobotu"];
    const nextDay = Number(next.lesson.dataset.day);

    scheduleStatus.textContent = `Výučba práve neprebieha. Najbližšie: ${formatLesson(next.lesson)} v ${dayNames[nextDay]}.`;
}

const filterButtons = [...document.querySelectorAll(".schedule__filter")];
const filterStatus = document.querySelector("#schedule-filter-status");

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selectedFilter = button.dataset.filter;
        let visibleLessons = 0;

        filterButtons.forEach((filterButton) => {
            filterButton.setAttribute("aria-pressed", String(filterButton === button));
        });

        lessons.forEach((lesson) => {
            const isVisible = selectedFilter === "all" || lesson.dataset.type === selectedFilter;
            lesson.classList.toggle("lesson--filtered", !isVisible);
            if (isVisible) {
                visibleLessons += 1;
            }
        });

        if (filterStatus) {
            filterStatus.hidden = visibleLessons > 0;
            filterStatus.textContent = visibleLessons > 0
                ? ""
                : "Pre zvolený filter nie sú žiadne hodiny.";
        }
    });
});

function updateSemesterProgress() {
    const progress = document.querySelector("#semester-progress");
    const label = document.querySelector("#semester-progress-label");

    if (!progress || !label) {
        return;
    }

    const elapsed = Date.now() - SEMESTER_START.getTime();
    const duration = SEMESTER_END.getTime() - SEMESTER_START.getTime();
    const percentage = Math.min(100, Math.max(0, elapsed / duration * 100));
    const roundedPercentage = Math.round(percentage);

    progress.value = percentage;
    progress.textContent = `${roundedPercentage} %`;
    label.value = `${roundedPercentage} %`;
}

updateCurrentLesson();
updateSemesterProgress();

const mapElement = document.querySelector("#map");

if (mapElement && window.L) {
    const fixedPlaces = {
        school: {name: "FEI STU", address: "Ilkovičova 3, Bratislava", latitude: 48.151965, longitude: 17.072995},
        home: {name: "ŠD Mladosť", address: "Staré Grunty 53, Bratislava", latitude: 48.1595464, longitude: 17.0635858}
    };
    const storageKey = "savedPlaces";
    const placeForm = document.querySelector("#place-form");
    const placeNameInput = document.querySelector("#place-name");
    const cancelPlaceButton = document.querySelector("#cancel-place");
    const targetSelect = document.querySelector("#map-target");
    const savedPlacesList = document.querySelector("#saved-places");
    const emptyMessage = document.querySelector("#places-empty");
    const distanceResult = document.querySelector("#distance-result");
    const map = L.map(mapElement).setView([48.1557, 17.0683], 15);
    const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-primary")
        .trim();

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const createIcon = (modifier) => L.divIcon({
        className: "map-marker",
        html: `<span class="map-marker__pin ${modifier}"></span>`,
        iconSize: [24, 30],
        iconAnchor: [12, 30]
    });
    const fixedIcon = createIcon("map-marker__pin--fixed");
    const customIcon = createIcon("map-marker__pin--custom");

    Object.values(fixedPlaces).forEach((place) => {
        L.marker([place.latitude, place.longitude], {icon: fixedIcon})
            .addTo(map)
            .bindPopup(`<strong>${place.name}</strong><br>${place.address}`);
    });

    let savedPlaces = loadSavedPlaces();
    let pendingPoint = null;
    let pendingMarker = null;
    let selectedPlaceId = null;
    let distanceLine = null;
    const customMarkers = new Map();

    function loadSavedPlaces() {
        try {
            const storedPlaces = JSON.parse(localStorage.getItem(storageKey));
            if (!Array.isArray(storedPlaces)) return [];
            return storedPlaces.filter((place) => {
                return typeof place.id === "string"
                    && typeof place.name === "string"
                    && Number.isFinite(place.latitude)
                    && Number.isFinite(place.longitude);
            });
        } catch {
            return [];
        }
    }

    function createPlacePopup(name, description = "") {
        const popup = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = name;
        popup.append(heading);

        if (description) {
            const text = document.createElement("p");
            text.textContent = description;
            popup.append(text);
        }

        return popup;
    }

    function calculateDistance(start, end) {
        const earthRadius = 6371;
        const toRadians = (degrees) => degrees * Math.PI / 180;
        const latitudeDifference = toRadians(end.latitude - start.latitude);
        const longitudeDifference = toRadians(end.longitude - start.longitude);
        const haversine = Math.sin(latitudeDifference / 2) ** 2
            + Math.cos(toRadians(start.latitude)) * Math.cos(toRadians(end.latitude))
            * Math.sin(longitudeDifference / 2) ** 2;
        return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
    }

    function showDistance(place) {
        const target = fixedPlaces[targetSelect.value];
        const distance = calculateDistance(place, target);
        distanceLine?.remove();
        distanceLine = L.polyline([
            [place.latitude, place.longitude],
            [target.latitude, target.longitude]
        ], {color: primaryColor, weight: 4, dashArray: "8 8"}).addTo(map);
        map.fitBounds(distanceLine.getBounds(), {padding: [40, 40]});
        const description = `Vzdialenosť k ${target.name}: ${distance.toFixed(2)} km vzdušnou čiarou.`;
        distanceResult.textContent = `${place.name} → ${target.name}: ${distance.toFixed(2)} km vzdušnou čiarou.`;
        customMarkers.get(place.id)?.bindPopup(createPlacePopup(place.name, description)).openPopup();
    }

    function selectPlace(place) {
        selectedPlaceId = place.id;
        renderSavedPlaces();
        showDistance(place);
    }

    function renderSavedPlaces() {
        savedPlacesList.replaceChildren();
        emptyMessage.hidden = savedPlaces.length > 0;

        savedPlaces.forEach((place) => {
            if (!customMarkers.has(place.id)) {
                const marker = L.marker([place.latitude, place.longitude], {icon: customIcon})
                    .addTo(map)
                    .bindPopup(createPlacePopup(place.name));
                marker.on("click", () => selectPlace(place));
                customMarkers.set(place.id, marker);
            }

            const listItem = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = place.name;
            button.setAttribute("aria-pressed", String(place.id === selectedPlaceId));
            button.addEventListener("click", () => selectPlace(place));
            listItem.append(button);
            savedPlacesList.append(listItem);
        });
    }

    function cancelPendingPlace() {
        pendingPoint = null;
        placeForm.hidden = true;
        placeForm.reset();
        pendingMarker?.remove();
        pendingMarker = null;
    }

    map.on("click", (event) => {
        pendingPoint = event.latlng;
        if (pendingMarker) pendingMarker.setLatLng(event.latlng);
        else pendingMarker = L.marker(event.latlng, {icon: customIcon}).addTo(map);
        placeForm.hidden = false;
        placeNameInput.focus();
    });

    placeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = placeNameInput.value.trim();
        if (!name || !pendingPoint) return;

        const place = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name,
            latitude: pendingPoint.lat,
            longitude: pendingPoint.lng
        };
        savedPlaces.push(place);
        localStorage.setItem(storageKey, JSON.stringify(savedPlaces));
        cancelPendingPlace();
        renderSavedPlaces();
        selectPlace(place);
    });

    cancelPlaceButton.addEventListener("click", cancelPendingPlace);
    targetSelect.addEventListener("change", () => {
        const selectedPlace = savedPlaces.find((place) => place.id === selectedPlaceId);
        if (selectedPlace) showDistance(selectedPlace);
    });

    renderSavedPlaces();
}

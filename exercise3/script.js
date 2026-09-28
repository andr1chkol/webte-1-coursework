//Weather Api

const weatherUrl =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=48.15" +
    "&longitude=17.11" +
    "&current=temperature_2m," +
    "wind_speed_10m," +
    "relative_humidity_2m," +
    "precipitation_probability," +
    "&timezone=auto";

fetch(weatherUrl)
    .then(response => response.json())
    .then(data => {
        console.log(data);

        document.getElementById("weather").innerHTML =
            "<b>Mesto: Bratislava</b><br>" +
            "Teplota: " + data.current.temperature_2m + " °C<br>" +
            "Vietor: " + data.current.wind_speed_10m + " km/h<br>" +
            "Vlhkost: " + data.current.relative_humidity_2m + " %<br>" +
            "Pravdepodobnosť zrážok: " + data.current.precipitation_probability + " %<br>"
        ;
    })
    .catch(error => {
        console.error("Chyba:", error);
    });

// Map Api
const map = L.map("map").setView(
    [48.151965, 17.072995],
    15
);

L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
).addTo(map);

L.marker([48.69644442309499, 21.222522887589335])
    .addTo(map)
    .bindPopup("Lunik IX")
    .openPopup();
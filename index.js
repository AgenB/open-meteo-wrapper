const weather_codes = {
    "0": "clear sky",
    "1": "mainly clear",
    "2": "partly cloudy",
    "3": "overcast",
    "45": "fog",
    "48": "depositing rime fog",
    "51": "light drizzle",
    "53": "moderate drizzle",
    "55": "heavy drizzle",
    "56": "light freezing drizzle",
    "57": "heavy freezing drizzle",
    "61": "slight rain",
    "63": "moderate rain",
    "65": "heavy rain",
    "66": "light freezing rain",
    "67": "heavy freezing rain",
    "71": "slight snow fall",
    "73": "moderate snow fall",
    "75": "heavy snow fall",
    "77": "snow grains",
    "80": "slight rain showers",
    "81": "moderate rain showers",
    "82": "violent rain showers",
    "85": "slight snow showers",
    "86": "heavy snow showers",
    "95": "thunderstorm",
    "96": "thunderstorm with slight hail",
    "99": "thunderstorm with heavy hail"
};

function check_valid(type, text) {
    const types = {
        "date": {reg: /^\d{4}-\d{2}-\d{2}$|^([0-9]|1[0-4])$/},
        "hour": {reg: /^([01]?\d|2[0-3])$/}
    }
    if (types[type].reg.test(text)) {
        return true;
    }
    else {
        return false;
    }
}
function getISODateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        const city = url.searchParams.get("city");
        const date = url.searchParams.get("date");
        const hour = url.searchParams.get("hour");
        const debug = url.searchParams.get("debug");
        let date_calc;
        let mode = "daily";
        let lat;
        let lon;
        let meteo_url = "";

        if (!city) {
            return Response.json(
                {error: true, message: "Missing 'city' query parameter"},
                {status: 400}
            );
        }
        if (date) {
            if (!check_valid("date", date)) {
                return Response.json(
                    {error: true, message: "invalid date format"},
                    {status: 400}
                );
            }
            date_calc = date;
            if (date.length <= 2) {
                let day = new Date();
                day.setDate(day.getDate() + parseInt(date));
                date_calc = getISODateString(day);
            }
        }
        if (hour) {
            if (!check_valid("hour", hour)) {
                return Response.json(
                    {error: true, message: "invalid hour format"},
                    {status: 400}
                );
            }

        }
        try {
            const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const data = await response.json();

            if (data && data.error === true) {
                return Response.json(
                    {error: true, message: "Upstream returned an error"},
                    {status: 502}
                );
            }
            if (data.results === undefined) {
                return Response.json(
                    {error: true, message: "location not found"},
                    {status: 404}
                );
            }
            lat = data.results[0].latitude;
            lon = data.results[0].longitude;
            // return Response.json(data);
        } catch (err) {
            return Response.json(
                {error: true, message: err.message},
                {status: 500}
            );
        }
        if (date) {
            if (hour) {
                mode = "hourly";
                meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code,temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=auto&start_hour=${date_calc}T${String(hour).padStart(2, "0")}:00&end_hour=${date_calc}T${String(hour).padStart(2, "0")}:00`;
            }
            else {
                meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_direction_10m_dominant,wind_speed_10m_max,temperature_2m_mean,apparent_temperature_mean,surface_pressure_mean&timezone=auto&past_days=0&start_date=${date_calc}&end_date=${date_calc}`;
            }
        }
        else if (hour) {
            mode = "hourly";
            date_calc = getISODateString(new Date());
            meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code,temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=auto&start_hour=${date_calc}T${String(hour).padStart(2, "0")}:00&end_hour=${date_calc}T${String(hour).padStart(2, "0")}:00`;
        }
        else {
            meteo_url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_direction_10m_dominant,wind_speed_10m_max,temperature_2m_mean,apparent_temperature_mean,surface_pressure_mean&timezone=auto&past_days=0&forecast_days=1`;
        }
        // return Response.json({meteo_url});
        try {
            const response = await fetch(meteo_url);
            const data = await response.json();

            if (data && data.error === true) {
                return Response.json(
                    {error: true, message: "Upstream returned an error"},
                    {status: 502}
                );
            }
            if (debug) return Response.json(data);
            const parse_funcs = {
                base: function(name) {return `${data[mode][name][0]}${data[mode+"_units"][name]}`;},
                code: function(name) {return weather_codes[String(data[mode][name][0])];},
                wind_dir: function(name) {
                    const dir_arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖", "↑"];
                    return dir_arrow[Math.floor((parseInt(data[mode][name][0]) + 22) / 45)];
                }
            };
            let out_parts = [];
            if (mode == "hourly") {
                out_parts.push(parse_funcs.code("weather_code"));
                out_parts.push(`🌡️${parse_funcs.base("temperature_2m")} feels like: ${parse_funcs.base("apparent_temperature")}`);
                out_parts.push(`🌧️${parse_funcs.base("precipitation_probability")} ${parse_funcs.base("precipitation")}`);
                out_parts.push(`💨${parse_funcs.wind_dir("wind_direction_10m")}${parse_funcs.base("wind_speed_10m")}`);
                out_parts.push(`${parse_funcs.base("surface_pressure")}`);
            }
            else {
                out_parts.push(parse_funcs.code("weather_code"));
                out_parts.push(`🌡️${parse_funcs.base("temperature_2m_mean")} (min: ${parse_funcs.base("temperature_2m_min")} max: ${parse_funcs.base("temperature_2m_max")}) feels like: ${parse_funcs.base("apparent_temperature_mean")} (min: ${parse_funcs.base("apparent_temperature_min")} max: ${parse_funcs.base("apparent_temperature_max")})`);
                out_parts.push(`🌧️${parse_funcs.base("precipitation_probability_max")} ${parse_funcs.base("precipitation_sum")}`);
                out_parts.push(`💨${parse_funcs.wind_dir("wind_direction_10m_dominant")}${parse_funcs.base("wind_speed_10m_max")}`);
                out_parts.push(`${parse_funcs.base("surface_pressure_mean")}`);
            }
            const out_string = out_parts.join(", ");
            return new Response(out_string);
        } catch (err) {
            return Response.json(
                {error: true, message: err.message},
                {status: 500}
            );
        }
    },
});

console.log(`Server running at http://localhost:${server.port}/`);

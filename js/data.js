// High-fidelity spatial dataset for EV Charging Stations.
// Programmatically generated with realistic clusters around major US hubs to simulate spatial datasets.

const CITIES = [
    { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
    { name: "Delhi NCR", lat: 28.6139, lng: 77.2090 },
    { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
    { name: "Chennai", lat: 13.0827, lng: 80.2707 },
    { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 }
];

const OPERATORS = [
    { name: "Tata Power EZ Charge", color: "#0069b4", marketShare: 0.38 },
    { name: "Ather Grid", color: "#1cc296", marketShare: 0.24 },
    { name: "ChargeZone", color: "#e67e22", marketShare: 0.16 },
    { name: "Zeon Charging", color: "#84c341", marketShare: 0.12 },
    { name: "Fortum Charge & Drive", color: "#00b4d8", marketShare: 0.10 }
];

const CONNECTORS = {
    "Tata Power EZ Charge": ["CCS2", "Type 2", "GB/T", "15A Socket"],
    "Ather Grid": ["Type 2", "15A Socket"],
    "ChargeZone": ["CCS2", "Type 2"],
    "Zeon Charging": ["CCS2", "Type 2"],
    "Fortum Charge & Drive": ["CCS2", "Type 2", "GB/T"]
};

// Seeded random number generator for reproducibility
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function generateDataset() {
    const stations = [];
    let id = 1;
    let seed = 42;

    CITIES.forEach((city) => {
        // Generate between 15 and 25 stations per city
        const count = Math.floor(seededRandom(seed++) * 11) + 15;

        for (let i = 0; i < count; i++) {
            // Pick operator based on market share distribution
            const roll = seededRandom(seed++);
            let operator = OPERATORS[0];
            let cumulative = 0;
            for (let op of OPERATORS) {
                cumulative += op.marketShare;
                if (roll <= cumulative) {
                    operator = op;
                    break;
                }
            }

            // Power levels & details
            const isDCFast = operator.name === "Tesla Supercharger" || seededRandom(seed++) > 0.4;
            const powerKW = isDCFast 
                ? [50, 150, 250, 350][Math.floor(seededRandom(seed++) * 4)]
                : [7.2, 11, 22][Math.floor(seededRandom(seed++) * 3)];
            
            const totalPorts = isDCFast 
                ? [4, 8, 12, 16, 24][Math.floor(seededRandom(seed++) * 5)]
                : [2, 4, 6, 8][Math.floor(seededRandom(seed++) * 4)];
            
            // Random status distribution
            const statusRoll = seededRandom(seed++);
            let status = "Available";
            let availablePorts = totalPorts;

            if (statusRoll < 0.6) {
                status = "In Use";
                // Randomly occupy some ports
                availablePorts = Math.floor(seededRandom(seed++) * totalPorts);
            } else if (statusRoll < 0.7) {
                status = "Maintenance";
                availablePorts = 0;
            }

            // Price calculation (DC Fast is more expensive)
            const basePrice = isDCFast ? 18.50 : 12.00;
            const priceVariance = (seededRandom(seed++) * 4.0) - 2.0;
            const price = parseFloat((basePrice + priceVariance).toFixed(2));

            // Offset coordinates slightly to cluster them in the city
            const latOffset = (seededRandom(seed++) - 0.5) * 0.15;
            const lngOffset = (seededRandom(seed++) - 0.5) * 0.18;

            const nameSuffixes = ["Plaza", "Mall Center", "Hub", "Charging Station", "Expressway", "Square", "Park & Ride", "Superhub"];
            const suffix = nameSuffixes[Math.floor(seededRandom(seed++) * nameSuffixes.length)];

            stations.push({
                id: `EV-${id++}`,
                name: `${operator.name} - ${city.name} ${suffix} #${i + 1}`,
                city: city.name,
                lat: city.lat + latOffset,
                lng: city.lng + lngOffset,
                operator: operator.name,
                operatorColor: operator.color,
                status: status,
                connectors: CONNECTORS[operator.name] || ["CCS"],
                powerLevel: isDCFast ? "DC Fast" : "Level 2",
                powerKW: powerKW,
                totalPorts: totalPorts,
                availablePorts: availablePorts,
                pricePerKWh: price,
                rating: parseFloat((3.5 + seededRandom(seed++) * 1.5).toFixed(1))
            });
        }
    });

    return stations;
}

// Generate the global dataset
const evStationsDataset = generateDataset();

// Generate historical growth data for analytics
const historicalGrowthData = {
    labels: ["2021", "2022", "2023", "2024", "2025", "2026 (YTD)"],
    datasets: [
        {
            label: "AC Chargers (Type 2/15A)",
            data: [2500, 5200, 11000, 24000, 48000, 62000],
            borderColor: "#00f2fe",
            backgroundColor: "rgba(0, 242, 254, 0.1)",
        },
        {
            label: "DC Fast Chargers (CCS2/GB/T)",
            data: [400, 950, 2600, 5800, 12000, 17500],
            borderColor: "#39ff14",
            backgroundColor: "rgba(57, 255, 20, 0.1)",
        }
    ]
};

// Global exports for browser
window.evStationsData = evStationsDataset;
window.historicalGrowthData = historicalGrowthData;
window.operatorsMeta = OPERATORS;
window.citiesData = CITIES;

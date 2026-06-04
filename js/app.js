// VoltMap Core Dashboard Logic

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // State Management.
    // ----------------------------------------------------
    let map = null;
    let markersLayer = L.layerGroup();
    let chartSpeed = null;
    let chartOperator = null;
    
    // Default India center for map recentering
    const INDIA_CENTER = [20.5937, 78.9629];
    const INDIA_ZOOM = 5;
    
    const activeFilters = {
        search: "",
        city: "All",
        powerType: "All",
        operators: [],
        connectors: [],
        statuses: []
    };

    // ----------------------------------------------------
    // UI Initialization
    // ----------------------------------------------------
    initHeaderTime();
    initOperatorCheckboxes();
    initFilterState();
    initMap();
    initCharts();
    
    // Attach Event Listeners
    attachEventListeners();
    
    // Run initial data pipeline render
    updateDashboard();

    // Hide loader overlay with transition
    setTimeout(() => {
        const loader = document.getElementById("loader");
        if (loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.style.display = "none", 500);
        }
    }, 1200);

    // ----------------------------------------------------
    // Header Live Clock
    // ----------------------------------------------------
    function initHeaderTime() {
        const timeEl = document.getElementById("current-time");
        const updateTime = () => {
            const now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 should be 12
            minutes = minutes < 10 ? '0' + minutes : minutes;
            timeEl.innerHTML = `<i class="fa-solid fa-clock"></i> Local Time: <strong>${hours}:${minutes} ${ampm}</strong>`;
        };
        updateTime();
        setInterval(updateTime, 30000);
    }

    // ----------------------------------------------------
    // Render Operator Checkboxes Dynamically
    // ----------------------------------------------------
    function initOperatorCheckboxes() {
        const container = document.getElementById("operator-checkbox-list");
        container.innerHTML = "";
        
        window.operatorsMeta.forEach(op => {
            const label = document.createElement("label");
            label.className = "checkbox-container";
            label.innerHTML = `
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${op.color}; box-shadow: 0 0 6px ${op.color};"></span>
                    ${op.name}
                </span>
                <input type="checkbox" value="${op.name}" checked />
                <span class="checkmark"></span>
            `;
            container.appendChild(label);
        });
    }

    // ----------------------------------------------------
    // Initialize Filtering State from UI Inputs
    // ----------------------------------------------------
    function initFilterState() {
        activeFilters.search = document.getElementById("search-input").value.trim().toLowerCase();
        activeFilters.city = document.getElementById("city-filter").value;
        
        // Power Type (Segmented control)
        const activeSegment = document.querySelector(".segmented-control .segment-btn.active");
        activeFilters.powerType = activeSegment ? activeSegment.dataset.value : "All";
        
        // Operators checklist
        activeFilters.operators = Array.from(document.querySelectorAll("#operator-checkbox-list input:checked"))
            .map(cb => cb.value);
            
        // Connectors checklist
        activeFilters.connectors = Array.from(document.querySelectorAll("#connector-checkbox-list input:checked"))
            .map(cb => cb.value);
            
        // Status checklist
        activeFilters.statuses = Array.from(document.querySelectorAll("#status-checkbox-list input:checked"))
            .map(cb => cb.value);
    }

    // ----------------------------------------------------
    // Leaflet Map Initialization
    // ----------------------------------------------------
    function initMap() {
        // Initialize Map in viewport
        map = L.map("map-viewport", {
            zoomControl: false // Move zoom control to custom corner
        }).setView(INDIA_CENTER, INDIA_ZOOM);

        // Custom styled zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Add CartoDB Dark Matter tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        markersLayer.addTo(map);
    }

    // ----------------------------------------------------
    // ChartJS Chart Instantiations
    // ----------------------------------------------------
    function initCharts() {
        // Global Chart.js configuration overrides for Dark Theme
        Chart.defaults.color = '#9ca3af';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.plugins.legend.labels.boxWidth = 12;
        Chart.defaults.plugins.legend.labels.padding = 10;
        
        // Speed profiles Chart
        const speedCtx = document.getElementById("type-chart").getContext("2d");
        chartSpeed = new Chart(speedCtx, {
            type: 'doughnut',
            data: {
                labels: ['DC Fast', 'Level 2'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#39ff14', '#06b6d4'],
                    borderWidth: 1,
                    borderColor: 'rgba(17, 24, 39, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#f3f4f6',
                            font: { size: 10 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#fff',
                        bodyColor: '#9ca3af',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                cutout: '70%'
            }
        });

        // Operators Horizontal Bar Chart
        const opCtx = document.getElementById("operator-chart").getContext("2d");
        chartOperator = new Chart(opCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Stations count',
                    data: [],
                    backgroundColor: [],
                    borderRadius: 4,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { font: { size: 9 }, precision: 0 }
                    },
                    y: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { size: 9 }, color: '#f3f4f6' }
                    }
                }
            }
        });
    }

    // ----------------------------------------------------
    // Update Dashboard Pipeline (Filtering, Stats, Visuals)
    // ----------------------------------------------------
    function updateDashboard() {
        // 1. Filtering Logic
        const filteredStations = window.evStationsData.filter(station => {
            // Search text match
            const searchMatch = station.name.toLowerCase().includes(activeFilters.search) || 
                                station.city.toLowerCase().includes(activeFilters.search) ||
                                station.id.toLowerCase().includes(activeFilters.search);
                                
            // City match
            const cityMatch = activeFilters.city === "All" || station.city === activeFilters.city;
            
            // Power level match
            const powerMatch = activeFilters.powerType === "All" || station.powerLevel === activeFilters.powerType;
            
            // Operator match
            const opMatch = activeFilters.operators.includes(station.operator);
            
            // Connector match
            const connMatch = station.connectors.some(conn => activeFilters.connectors.includes(conn));
            
            // Status match
            const statusMatch = activeFilters.statuses.includes(station.status);

            return searchMatch && cityMatch && powerMatch && opMatch && connMatch && statusMatch;
        });

        // Update top-right rows counters
        document.getElementById("header-dataset-size").textContent = window.evStationsData.length;
        document.getElementById("stations-table-count").textContent = `Showing ${filteredStations.length} of ${window.evStationsData.length} records`;

        // 2. Compute KPI Metrics
        computeKPIs(filteredStations);

        // 3. Update Map Layers
        updateMapMarkers(filteredStations);

        // 4. Update Charts
        updateCharts(filteredStations);

        // 5. Update Stations Grid Table
        updateTable(filteredStations);
    }

    // ----------------------------------------------------
    // Calculate and Animate KPI Metrics
    // ----------------------------------------------------
    function computeKPIs(stations) {
        const totalLocations = stations.length;
        
        let totalPorts = 0;
        let availablePorts = 0;
        let cumulativePower = 0;
        let cumulativePrice = 0;
        
        stations.forEach(st => {
            totalPorts += st.totalPorts;
            availablePorts += st.availablePorts;
            cumulativePower += st.powerKW;
            cumulativePrice += st.pricePerKWh;
        });

        const avgPower = totalLocations > 0 ? Math.round(cumulativePower / totalLocations) : 0;
        const avgPrice = totalLocations > 0 ? (cumulativePrice / totalLocations).toFixed(2) : "0.00";
        const availabilityPercent = totalPorts > 0 ? Math.round((availablePorts / totalPorts) * 100) : 0;

        // Populate elements
        animateCount("kpi-total-stations", totalLocations);
        animateCount("kpi-available-ports", availablePorts);
        document.getElementById("kpi-available-ports-percent").textContent = `${availabilityPercent}% ports online`;
        document.getElementById("kpi-avg-power").textContent = `${avgPower} kW`;
        document.getElementById("kpi-avg-price").textContent = `₹${avgPrice}/kWh`;
    }

    // Stats counter transition
    function animateCount(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const duration = 800; // ms
        const start = parseInt(el.textContent) || 0;
        const diff = targetValue - start;
        if (diff === 0) {
            el.textContent = targetValue;
            return;
        }

        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const ease = progress * (2 - progress);
            el.textContent = Math.round(start + diff * ease);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = targetValue;
            }
        }
        
        requestAnimationFrame(step);
    }

    // ----------------------------------------------------
    // Map Marker Rendering
    // ----------------------------------------------------
    function updateMapMarkers(stations) {
        // Clear all previous layer markers
        markersLayer.clearLayers();
        
        const mapBounds = [];

        stations.forEach(st => {
            // Create a custom styled marker element
            const customIcon = L.divIcon({
                className: 'custom-marker-wrapper',
                html: `
                    <div class="custom-pin" style="border-color: ${st.operatorColor}; box-shadow: 0 0 10px ${st.operatorColor};">
                        <i class="fa-solid fa-bolt" style="color: ${st.operatorColor};"></i>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });

            // Create marker
            const marker = L.marker([st.lat, st.lng], { icon: customIcon });

            // Create popup layout
            const popupContent = `
                <div class="map-popup-card">
                    <div class="map-popup-header">
                        <div class="map-popup-title" style="color: ${st.operatorColor};">${st.name}</div>
                        <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 0.15rem;">ID: ${st.id}</div>
                    </div>
                    <div class="map-popup-row" style="margin-top: 0.25rem;">
                        <span>City:</span>
                        <span class="val">${st.city}</span>
                    </div>
                    <div class="map-popup-row">
                        <span>Speed Class:</span>
                        <span class="val" style="color: ${st.powerLevel === "DC Fast" ? "#39ff14" : "#06b6d4"}; font-weight: bold;">
                            ${st.powerLevel} (${st.powerKW} kW)
                        </span>
                    </div>
                    <div class="map-popup-row">
                        <span>Ports:</span>
                        <span class="val">${st.availablePorts} / ${st.totalPorts} Available</span>
                    </div>
                    <div class="map-popup-row">
                        <span>Rate:</span>
                        <span class="val" style="color: #fff;">₹${st.pricePerKWh.toFixed(2)}/kWh</span>
                    </div>
                    <div class="map-popup-row">
                        <span>Rating:</span>
                        <span class="val" style="color: #fbbf24;">
                            <i class="fa-solid fa-star" style="font-size: 0.75rem;"></i> ${st.rating} / 5.0
                        </span>
                    </div>
                    <div class="map-popup-footer">
                        <span class="badge ${st.status.toLowerCase().replace(" ", "")}">
                            <span class="badge-dot"></span>${st.status}
                        </span>
                        <button class="map-popup-route-btn" onclick="window.focusOnStation('${st.id}')">
                            <i class="fa-solid fa-crosshairs"></i> Focus
                        </button>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
            
            mapBounds.push([st.lat, st.lng]);
        });

        // Dynamically adjust map bounds if there are markers to match density
        if (mapBounds.length > 0 && activeFilters.city !== "All") {
            map.fitBounds(mapBounds, { padding: [40, 40], maxZoom: 13 });
        }
    }

    // ----------------------------------------------------
    // ChartJS Updates
    // ----------------------------------------------------
    function updateCharts(stations) {
        // 1. Speed Profile count calculations
        let dcFastCount = 0;
        let level2Count = 0;
        
        stations.forEach(st => {
            if (st.powerLevel === "DC Fast") dcFastCount++;
            else level2Count++;
        });

        chartSpeed.data.datasets[0].data = [dcFastCount, level2Count];
        chartSpeed.update();

        // 2. Operator market share calculations
        const opCounts = {};
        stations.forEach(st => {
            opCounts[st.operator] = (opCounts[st.operator] || 0) + 1;
        });

        // Sort operators by count descending
        const sortedOps = Object.keys(opCounts).sort((a, b) => opCounts[b] - opCounts[a]);
        
        // Match meta colors
        const opColors = sortedOps.map(opName => {
            const match = window.operatorsMeta.find(op => op.name === opName);
            return match ? match.color : '#6b7280';
        });

        chartOperator.data.labels = sortedOps;
        chartOperator.data.datasets[0].data = sortedOps.map(op => opCounts[op]);
        chartOperator.data.datasets[0].backgroundColor = opColors;
        chartOperator.update();
    }

    // ----------------------------------------------------
    // Update Station Inventory Table
    // ----------------------------------------------------
    function updateTable(stations) {
        const tbody = document.getElementById("station-table-body");
        tbody.innerHTML = "";

        if (stations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                        No stations match the selected filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        stations.forEach(st => {
            const tr = document.createElement("tr");
            tr.setAttribute("data-id", st.id);
            
            // Format connectors pills
            const connPills = st.connectors.map(c => `<span class="connector-pill">${c}</span>`).join("");
            
            // Format status badge
            const statusClass = st.status.toLowerCase().replace(" ", "");
            const statusBadge = `
                <span class="badge ${statusClass}">
                    <span class="badge-dot"></span>
                    ${st.status}
                </span>
            `;

            // Format power level badge
            const powerClass = st.powerLevel.toLowerCase().replace(" ", "");
            const powerBadge = `<span class="badge ${powerClass}">${st.powerLevel} (${st.powerKW}kW)</span>`;

            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--text-primary);">${st.id}</td>
                <td style="font-weight: 500; color: #fff;">${st.name}</td>
                <td>${st.city}</td>
                <td style="display: flex; align-items: center; gap: 0.5rem; border: none; padding-top: 1.15rem;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${st.operatorColor};"></span>
                    ${st.operator}
                </td>
                <td>${connPills}</td>
                <td>${powerBadge}</td>
                <td><strong>${st.availablePorts}</strong> / ${st.totalPorts}</td>
                <td style="color: #fff; font-weight: 600;">₹${st.pricePerKWh.toFixed(2)}</td>
                <td>${statusBadge}</td>
            `;

            // Add click listener to pan map and open marker popup
            tr.addEventListener("click", () => {
                focusOnStation(st.id);
            });

            tbody.appendChild(tr);
        });
    }

    // ----------------------------------------------------
    // Focus Map View on Specific Station Coordinates
    // ----------------------------------------------------
    function focusOnStation(stationId) {
        const station = window.evStationsData.find(st => st.id === stationId);
        if (!station || !map) return;

        // Scroll to map smooth
        const mapContainer = document.getElementById("map-viewport");
        if (mapContainer) {
            mapContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Focus Map
        map.setView([station.lat, station.lng], 14, {
            animate: true,
            duration: 1.2
        });

        // Find and open leaflet popup
        markersLayer.eachLayer(layer => {
            const latlng = layer.getLatLng();
            if (latlng.lat === station.lat && latlng.lng === station.lng) {
                setTimeout(() => {
                    layer.openPopup();
                }, 1200);
            }
        });
    }

    // Expose focus function globally so it can be triggered from popup triggers
    window.focusOnStation = focusOnStation;

    // ----------------------------------------------------
    // Event Listeners Bindings
    // ----------------------------------------------------
    function attachEventListeners() {
        // Search Input with basic debouncing
        let searchTimeout = null;
        document.getElementById("search-input").addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                activeFilters.search = e.target.value.trim().toLowerCase();
                updateDashboard();
            }, 300);
        });

        // City Selector Dropdown
        document.getElementById("city-filter").addEventListener("change", (e) => {
            activeFilters.city = e.target.value;
            // If they switch to a specific city, reset the map centering for that city
            if (activeFilters.city !== "All") {
                const cityMatch = window.citiesData.find(c => c.name === activeFilters.city);
                if (cityMatch && map) {
                    map.setView([cityMatch.lat, cityMatch.lng], 10);
                }
            } else {
                map.setView(INDIA_CENTER, INDIA_ZOOM);
            }
            updateDashboard();
        });

        // Segmented Control (Power Type)
        document.querySelectorAll(".segmented-control .segment-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".segmented-control .segment-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                activeFilters.powerType = e.target.dataset.value;
                updateDashboard();
            });
        });

        // Operator Checkboxes change
        document.getElementById("operator-checkbox-list").addEventListener("change", () => {
            activeFilters.operators = Array.from(document.querySelectorAll("#operator-checkbox-list input:checked"))
                .map(cb => cb.value);
            updateDashboard();
        });

        // Connector Checkboxes change
        document.getElementById("connector-checkbox-list").addEventListener("change", () => {
            activeFilters.connectors = Array.from(document.querySelectorAll("#connector-checkbox-list input:checked"))
                .map(cb => cb.value);
            updateDashboard();
        });

        // Status Checkboxes change
        document.getElementById("status-checkbox-list").addEventListener("change", () => {
            activeFilters.statuses = Array.from(document.querySelectorAll("#status-checkbox-list input:checked"))
                .map(cb => cb.value);
            updateDashboard();
        });

        // Reset Filters Button
        document.getElementById("reset-filters").addEventListener("click", () => {
            // Restore default values
            document.getElementById("search-input").value = "";
            document.getElementById("city-filter").value = "All";
            
            // Segmented active
            document.querySelectorAll(".segmented-control .segment-btn").forEach(b => b.classList.remove("active"));
            const allBtn = document.querySelector(".segmented-control .segment-btn[data-value='All']");
            if (allBtn) allBtn.classList.add("active");
            
            // Checkboxes checking
            document.querySelectorAll("#operator-checkbox-list input").forEach(cb => cb.checked = true);
            document.querySelectorAll("#connector-checkbox-list input").forEach(cb => cb.checked = true);
            document.querySelectorAll("#status-checkbox-list input").forEach(cb => cb.checked = true);

            // Re-sync filter state
            initFilterState();
            
            // Reset map viewport
            if (map) {
                map.setView(INDIA_CENTER, INDIA_ZOOM);
            }
            
            updateDashboard();
        });

        // Recenter Map Control
        document.getElementById("map-recenter-btn").addEventListener("click", () => {
            if (map) {
                if (activeFilters.city !== "All") {
                    const cityMatch = window.citiesData.find(c => c.name === activeFilters.city);
                    if (cityMatch) {
                        map.setView([cityMatch.lat, cityMatch.lng], 10);
                        return;
                    }
                }
                map.setView(INDIA_CENTER, INDIA_ZOOM);
            }
        });
    }
});

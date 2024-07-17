// initialize basemap
mapboxgl.accessToken = 'pk.eyJ1IjoiamFrb2J6aGFvIiwiYSI6ImNpcms2YWsyMzAwMmtmbG5icTFxZ3ZkdncifQ.P9MBej1xacybKcDN_jehvw';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/light-v11', // style URL
    zoom: 9, // starting zoom
    maxBounds: [
        [-122.7, 47.33], // Southwest coordinates
        [-122.0, 47.9]  // Northeast coordinates
    ],
    center: [-122.33359685339107, 47.61195411777029] // starting center
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');

let geojson_data;
let sortCensus = [false, false, false, false]; // Sorting states for each column

async function fetchData() {
    try {
        const response = await fetch('data/map.geojson');
        if (!response.ok) throw new Error('Network response was not ok.');
        geojson_data = await response.json();
        setupMapLayers();  // Call setupMapLayers to ensure layers are added correctly
        populateTable();   // Populate table after data is fetched
    } catch (error) {
        console.error("Failed to fetch data:", error);
    }
}
fetchData();

function setupMapLayers() {
    if (!map.isStyleLoaded()) {
        map.on('load', addOrUpdateLayers);
    } else {
        addOrUpdateLayers();
    }
}

function addOrUpdateLayers() {
    if (map.getSource('geojson_data')) {
        map.getSource('geojson_data').setData(geojson_data);
    } else {
        map.addSource('geojson_data', {
            type: 'geojson',
            data: geojson_data
        });
    }

    if (!map.getLayer('geojson_data_layer')) {
        map.addLayer({
            'id': 'geojson_data_layer',
            'type': 'fill',
            'source': 'geojson_data',
            'paint': {
                'fill-color': [
                    'step',
                    ['get', 'SDQuintile'],
                    '#808080', 1, '#f8f8f8', 2, '#f8baba', 3, '#f87c7c', 4, '#f83e3e', 5, '#f80000'
                ],
                'fill-opacity': 0.7
            }
        });
    }
    // Adding border layer for clarity
    map.addLayer({
        'id': 'geojson_data_borders',
        'type': 'line',
        'source': 'geojson_data',
        'layout': {},
        'paint': {
            'line-color': '#000000',
            'line-width': 1
        }
    });

    attachEventHandlers();
}

function attachEventHandlers() {
    map.on('click', 'geojson_data_layer', function (e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const descriptionHTML = `
                <h3>${feature.properties.TractNameLong}</h3>
                <p>Socioeconomic Risk Index: ${feature.properties.SDQuintile}</p>
                <p>Total Population: ${feature.properties.TotalPop}</p> 
                <p>Median Household Devices: ${feature.properties.HHMedianDeviceCount}</p> `;
            document.getElementById('text-description').innerHTML = descriptionHTML;
        }
    });
    map.on('mouseenter', 'geojson_data_layer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'geojson_data_layer', function () {
        map.getCanvas().style.cursor = '';
    });
}

function setupLegend() {
    const legend = document.getElementById('legend');
    const riskLevels = [
        { color: '#ffffff', label: 'Very Low' },
        { color: '#f8baba', label: 'Low' },
        { color: '#f87c7c', label: 'Medium' },
        { color: '#f83e3e', label: 'High' },
        { color: '#f80000', label: 'Very High' }
    ];

    riskLevels.forEach(level => {
        const key = document.createElement('div');
        key.className = 'legend-key';
        key.style.backgroundColor = level.color;
        key.innerHTML = level.label;

        legend.appendChild(key);
    });
}

// Assuming map is initialized and setupMapLayers is your function to setup map layers
map.on('load', function() {
    setupMapLayers();
    setupLegend();
});

function populateTable() {
    const table = document.querySelector("#side-panel table ");

    geojson_data.features.forEach(feature => {
        const row = document.createElement('tr');
        const areaCell = document.createElement('td');
        const riskFactorCell = document.createElement('td');
        const meanIncomeCell = document.createElement('td');
        const devicesCell = document.createElement('td');

        areaCell.textContent = feature.properties.TractNameLong;
        riskFactorCell.textContent = feature.properties.SDQuintile;
        meanIncomeCell.textContent = feature.properties.TotalPop;
        devicesCell.textContent = feature.properties.HHMedianDeviceCount;

        row.appendChild(areaCell);
        row.appendChild(riskFactorCell);
        row.appendChild(meanIncomeCell);
        row.appendChild(devicesCell);

        table.appendChild(row);
    });

    attachSortListeners();  // Attach listeners after the table is populated
}

function attachSortListeners() {
    const sortHeaders = document.querySelectorAll("#side-panel th");
    sortHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            sortToggle(sortCensus, index);
            updateSortIcons();
        });
    });
}

function updateSortIcons() {
    const icons = document.querySelectorAll("#side-panel th i");
    icons.forEach((icon, index) => {
        icon.className = sortCensus[index] ? 'fa fa-fw fa-sort' : 'fa fa-fw fa-sort';
    });
}

function sortToggle(arr, num) {
    arr[num] = !arr[num]; // Toggle the census tract
    sortTable(num, arr[num]);
}

function sortTable(idx, isAsc) {
    let table = document.getElementsByTagName("table")[0];
    let tbody = table.getElementsByTagName('tbody')[0];
    let arr = Array.from(table.rows);

    let toprow = arr[0];
    arr.shift();
    arr = quickSort(arr, idx, isAsc);
    arr.unshift(toprow);

    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    arr.forEach(row => tbody.appendChild(row));
}

const quickSort = (arr, idx, isAsc) => {
    if (arr.length <= 1) {
      return arr;
    }
    let pivot = arr[0];
    let leftArr = [];
    let rightArr = [];
    for (let i = 1; i < arr.length; i++) {
        let x;
        let y;
        if (idx === 0) {
            x = arr[i].getElementsByTagName("td")[idx].innerHTML;
            y = pivot.getElementsByTagName("td")[idx].innerHTML;
        } else {
            x = parseFloat(arr[i].getElementsByTagName("td")[idx].innerHTML);
            y = parseFloat(pivot.getElementsByTagName("td")[idx].innerHTML);
        }
        if (isAsc) {
            if (x < y) {
                leftArr.push(arr[i]);
            } else {
                rightArr.push(arr[i]);
            }
        } else {
            if (x > y) {
                leftArr.push(arr[i]);
            } else {
                rightArr.push(arr[i]);
            }
        }
    }
    return [...quickSort(leftArr, idx, isAsc), pivot, ...quickSort(rightArr, idx, isAsc)];
};

function openNav() {
    document.getElementById("side-container").style.display = "block";
    document.getElementById("openbtn").style.display = "none";
}

function closeNav() {
    document.getElementById("side-container").style.display = "none";
    document.getElementById("openbtn").style.display = "block";
}

function openPopup(n) {
    if (n == 1) {
        if (document.getElementById("description-popup").style.display == "block") {
            closePopup(1);
        } else {
        closePopup(2);
        document.getElementById("description-popup").style.display = "block";
        }
    }
    else if (n == 2) {
        if (document.getElementById("acknowledge-popup").style.display == "block") {
            closePopup(2);
        } else {
            closePopup(1);
            document.getElementById("acknowledge-popup").style.display = "block";
        }
    }
}

function closePopup(n) {
    if (n == 1) {
        document.getElementById("description-popup").style.display = "none";
    }
    else if (n == 2) {
        document.getElementById("acknowledge-popup").style.display = "none";
    }
}
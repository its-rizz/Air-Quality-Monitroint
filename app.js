// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhYoDikZxTrlba8cS0V741Jx1n_YZHgkA",
  authDomain: "esp32-air-quality.firebaseapp.com",
  databaseURL: "https://esp32-air-quality-default-rtdb.firebaseio.com",
  projectId: "esp32-air-quality",
  storageBucket: "esp32-air-quality.appspot.com",
  messagingSenderId: "905509419713",
  appId: "1:905509419713:web:0e6d88bb120b0967247240",
  measurementId: "G-NW00VFZVJG",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference to the database
const database = firebase.database();
const dataRef = database.ref("/data");

// DOM Elements
const dataContainer = document.getElementById("data-container");
const loadingIndicator = document.getElementById("loading-indicator");
const updateTimeElement = document.getElementById("update-time");
const currentDateElement = document.getElementById("current-date");
const aqiValueElement = document.getElementById("aqi-value");
const aqiLabelElement = document.getElementById("aqi-label");
const aqiCircleElement = document.getElementById("aqi-circle");
const aqiDescriptionElement = document.getElementById("aqi-description");
const aqiAdviceElement = document.getElementById("aqi-advice");
const co2ValueElement = document.getElementById("co2-value");
const methaneValueElement = document.getElementById("methane-value");
const co2MeterElement = document.getElementById("co2-meter");
const methaneMeterElement = document.getElementById("methane-meter");

// DOM Elements for node cards
const nodeACard = document.getElementById("nodeA-card");
const nodeBCard = document.getElementById("nodeB-card");
const nodeAStatusElement = document.getElementById("nodeA-status");
const nodeBStatusElement = document.getElementById("nodeB-status");
const nodeAAqiValue = document.getElementById("nodeA-aqi-value");
const nodeBAqiValue = document.getElementById("nodeB-aqi-value");
const nodeAAqiLabel = document.getElementById("nodeA-aqi-label");
const nodeBAqiLabel = document.getElementById("nodeB-aqi-label");
const viewButtons = document.querySelectorAll(".view-btn");
const nodeActionButtons = document.querySelectorAll(".node-action-btn");

// DOM elements for sidebar menu
const sidebarMenuItems = document.querySelectorAll(".sidebar-menu li");
const viewContainers = document.querySelectorAll(".main > div");

// DOM elements for history controls
const timeRangeButtons = document.querySelectorAll(".time-btn");
const nodeSelectButtons = document.querySelectorAll(".node-select-btn");
const comparisonStatsContainer = document.getElementById("comparison-stats");

// Chart instances
let envChart;
let historyChart;
let historyEnvChart;
let historyCO2Chart;
let historyMethaneChart;

// Track the current selected device, view, and menu
let currentView = "all"; // all, compare
let focusedNode = null; // null, nodeA, nodeB
let activeMenu = "dashboard"; // dashboard, analytics, history, settings
let historyTimeRange = "day"; // day, week, month
let historyNodes = "both"; // both, nodeA, nodeB

// Store device MAC addresses
const nodeMacs = {
  nodeA: null, // Will be populated once we get the data
  nodeB: null, // Will be populated once we get the data
};

// Set the current date
const now = new Date();
currentDateElement.textContent = now.toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Initialize Charts
function initializeCharts() {
  const envChartElement = document.getElementById("envChart");
  const historyChartElement = document.getElementById("historyChart");

  if (envChartElement && historyChartElement) {
    try {
      // Environmental Chart (Temperature & Humidity)
      const envCtx = envChartElement.getContext("2d");
      envChart = new Chart(envCtx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Temperature (°C) - Node A",
              data: [],
              borderColor: "#f05454",
              backgroundColor: "rgba(240, 84, 84, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#f05454",
              tension: 0.4,
              fill: true,
            },
            {
              label: "Humidity (%) - Node A",
              data: [],
              borderColor: "#00b8a9",
              backgroundColor: "rgba(0, 184, 169, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#00b8a9",
              tension: 0.4,
              fill: true,
            },
            {
              label: "Temperature (°C) - Node B",
              data: [],
              borderColor: "#ff9800",
              backgroundColor: "rgba(255, 152, 0, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#ff9800",
              tension: 0.4,
              fill: true,
              hidden: true,
            },
            {
              label: "Humidity (%) - Node B",
              data: [],
              borderColor: "#2196f3",
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#2196f3",
              tension: 0.4,
              fill: true,
              hidden: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              grid: {
                color: "#f0f0f0",
              },
            },
          },
        },
      });

      // History Chart (CO2 & Methane)
      const historyCtx = historyChartElement.getContext("2d");
      historyChart = new Chart(historyCtx, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "CO₂ (ppm) - Node A",
              data: [],
              borderColor: "#2196f3",
              backgroundColor: "rgba(33, 150, 243, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#2196f3",
              tension: 0.4,
              fill: true,
              yAxisID: "y",
            },
            {
              label: "Methane (ppm) - Node A",
              data: [],
              borderColor: "#ff9800",
              backgroundColor: "rgba(255, 152, 0, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#ff9800",
              tension: 0.4,
              fill: true,
              yAxisID: "y1",
            },
            {
              label: "CO₂ (ppm) - Node B",
              data: [],
              borderColor: "#9c27b0",
              backgroundColor: "rgba(156, 39, 176, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#9c27b0",
              tension: 0.4,
              fill: true,
              yAxisID: "y",
              hidden: true,
            },
            {
              label: "Methane (ppm) - Node B",
              data: [],
              borderColor: "#4caf50",
              backgroundColor: "rgba(76, 175, 80, 0.1)",
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: "#4caf50",
              tension: 0.4,
              fill: true,
              yAxisID: "y1",
              hidden: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
            y: {
              type: "linear",
              display: true,
              position: "left",
              grid: {
                color: "#f0f0f0",
              },
              title: {
                display: true,
                text: "CO₂ (ppm)",
              },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: "Methane (ppm)",
              },
            },
          },
        },
      });
    } catch (err) {
      console.error("Error initializing charts:", err);
    }
  }
}

// Initialize history charts
function initializeHistoryCharts() {
  const historyEnvChartEl = document.getElementById("historyEnvChart");
  const historyCO2ChartEl = document.getElementById("historyCO2Chart");
  const historyMethaneChartEl = document.getElementById("historyMethaneChart");

  if (historyEnvChartEl && historyCO2ChartEl && historyMethaneChartEl) {
    // Environmental Chart (Temperature & Humidity)
    const envCtx = historyEnvChartEl.getContext("2d");
    historyEnvChart = new Chart(envCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C) - Node A",
            data: [],
            borderColor: "#f05454",
            backgroundColor: "rgba(240, 84, 84, 0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#f05454",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Humidity (%) - Node A",
            data: [],
            borderColor: "#00b8a9",
            backgroundColor: "rgba(0, 184, 169, 0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#00b8a9",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Temperature (°C) - Node B",
            data: [],
            borderColor: "#ff9800",
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#ff9800",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Humidity (%) - Node B",
            data: [],
            borderColor: "#2196f3",
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#2196f3",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            grid: {
              color: "#f0f0f0",
            },
          },
        },
      },
    });

    // CO2 Chart - Bar chart for better comparison
    const co2Ctx = historyCO2ChartEl.getContext("2d");
    historyCO2Chart = new Chart(co2Ctx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "CO₂ (ppm) - Node A",
            data: [],
            backgroundColor: "rgba(33, 150, 243, 0.7)",
            borderColor: "#2196f3",
            borderWidth: 1,
          },
          {
            label: "CO₂ (ppm) - Node B",
            data: [],
            backgroundColor: "rgba(156, 39, 176, 0.7)",
            borderColor: "#9c27b0",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: false,
            grid: {
              color: "#f0f0f0",
            },
            title: {
              display: true,
              text: "CO₂ (ppm)",
            },
          },
        },
      },
    });

    // Methane Chart - Area chart for trend visualization
    const methaneCtx = historyMethaneChartEl.getContext("2d");
    historyMethaneChart = new Chart(methaneCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Methane (ppm) - Node A",
            data: [],
            borderColor: "#ff9800",
            backgroundColor: "rgba(255, 152, 0, 0.2)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#ff9800",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Methane (ppm) - Node B",
            data: [],
            borderColor: "#4caf50",
            backgroundColor: "rgba(76, 175, 80, 0.2)",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: "#4caf50",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: false,
            grid: {
              color: "#f0f0f0",
            },
            title: {
              display: true,
              text: "Methane (ppm)",
            },
          },
        },
      },
    });
  }
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Format full timestamp
function formatFullTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Update the last updated time
function updateLastUpdatedTime() {
  if (updateTimeElement) {
    const now = new Date();
    updateTimeElement.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}

// Get AQI classification and color based on CO2 levels
function getAQIFromCO2(co2) {
  const co2Value = parseInt(co2);

  if (co2Value <= 600) {
    return {
      class: "good",
      label: "Good",
      value: Math.min(50, Math.round((co2Value / 600) * 50)),
      color: "#4caf50",
      description:
        "Air quality is considered satisfactory, and air pollution poses little or no risk.",
      advice: "It's a great day to be active outside!",
    };
  }

  if (co2Value <= 800) {
    return {
      class: "moderate",
      label: "Moderate",
      value: Math.min(100, Math.round(50 + ((co2Value - 600) / 200) * 50)),
      color: "#ffca28",
      description:
        "Air quality is acceptable; however, there may be some concern for a very small number of individuals.",
      advice:
        "Unusually sensitive people should consider reducing prolonged or heavy exertion.",
    };
  }

  if (co2Value <= 1000) {
    return {
      class: "unhealthy-sensitive",
      label: "Unhealthy for Sensitive Groups",
      value: Math.min(150, Math.round(101 + ((co2Value - 800) / 200) * 49)),
      color: "#ff9800",
      description: "Members of sensitive groups may experience health effects.",
      advice:
        "People with respiratory or heart conditions should limit prolonged outdoor activity.",
    };
  }

  if (co2Value <= 1500) {
    return {
      class: "unhealthy",
      label: "Unhealthy",
      value: Math.min(200, Math.round(151 + ((co2Value - 1000) / 500) * 49)),
      color: "#f44336",
      description:
        "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.",
      advice:
        "Everyone should reduce prolonged or heavy exertion. Sensitive individuals should stay indoors.",
    };
  }

  if (co2Value <= 2000) {
    return {
      class: "very-unhealthy",
      label: "Very Unhealthy",
      value: Math.min(300, Math.round(201 + ((co2Value - 1500) / 500) * 99)),
      color: "#9c27b0",
      description:
        "Health warnings of emergency conditions. The entire population is more likely to be affected.",
      advice:
        "Everyone should avoid all outdoor exertion. Sensitive groups should remain indoors.",
    };
  }

  return {
    class: "hazardous",
    label: "Hazardous",
    value: 301,
    color: "#7e1416",
    description:
      "Health alert: everyone may experience more serious health effects.",
    advice:
      "Everyone should avoid all outdoor exertion. If possible, remain indoors and keep activity levels low.",
  };
}

// Update AQI Gauge
function updateAQIGauge(aqiData) {
  if (
    !aqiValueElement ||
    !aqiLabelElement ||
    !aqiCircleElement ||
    !aqiDescriptionElement ||
    !aqiAdviceElement
  )
    return;

  // Update AQI value and label
  aqiValueElement.textContent = aqiData.value;
  aqiLabelElement.textContent = aqiData.label;

  // Update the gauge
  const circumference = 2 * Math.PI * 54;
  const dashOffset =
    ((300 - Math.min(aqiData.value, 300)) / 300) * circumference;

  aqiCircleElement.style.stroke = aqiData.color;
  aqiCircleElement.style.strokeDasharray = circumference;
  aqiCircleElement.style.strokeDashoffset = dashOffset;

  // Update description and advice
  aqiDescriptionElement.textContent = aqiData.description;
  aqiAdviceElement.textContent = aqiData.advice;
  aqiAdviceElement.style.backgroundColor = `${aqiData.color}15`;
  aqiAdviceElement.style.color = aqiData.color;
}

// Update gas meters
function updateGasMeters(co2, methane) {
  if (
    !co2ValueElement ||
    !methaneValueElement ||
    !co2MeterElement ||
    !methaneMeterElement
  )
    return;

  // Update values
  co2ValueElement.textContent = `${co2} ppm`;
  methaneValueElement.textContent = `${methane} ppm`;

  // Update meter levels
  // CO2: 300-2000 ppm range
  const co2Percentage = Math.min(100, Math.max(0, ((co2 - 300) / 1700) * 100));
  co2MeterElement.style.width = `${co2Percentage}%`;

  // Methane: 0-100 ppm range (adjust based on your typical ranges)
  const methanePercentage = Math.min(100, Math.max(0, (methane / 100) * 100));
  methaneMeterElement.style.width = `${methanePercentage}%`;
}

// Update node AQI cards based on latest data
function updateNodeCards(entriesByNode) {
  const nodeAEntries = entriesByNode.nodeA || [];
  const nodeBEntries = entriesByNode.nodeB || [];

  // Update Node A card if data available
  if (nodeAEntries.length > 0) {
    const latestA = nodeAEntries[0];
    const aqiData = getAQIFromCO2(latestA.co2);

    // Update status
    nodeAStatusElement.textContent = "Online";
    nodeAStatusElement.classList.remove("offline");

    // Update AQI value and label
    nodeAAqiValue.textContent = aqiData.value;
    nodeAAqiLabel.textContent = aqiData.label;

    // Update classes for styling
    nodeAAqiLabel.className = "aqi-label " + aqiData.class;
    nodeACard.className = "node-card " + aqiData.class;
  } else {
    // No data available for Node A
    nodeAStatusElement.textContent = "Offline";
    nodeAStatusElement.classList.add("offline");
    nodeAAqiValue.textContent = "--";
    nodeAAqiLabel.textContent = "No Data";
    nodeAAqiLabel.className = "aqi-label";
    nodeACard.className = "node-card";
  }

  // Update Node B card if data available
  if (nodeBEntries.length > 0) {
    const latestB = nodeBEntries[0];
    const aqiData = getAQIFromCO2(latestB.co2);

    // Update status
    nodeBStatusElement.textContent = "Online";
    nodeBStatusElement.classList.remove("offline");

    // Update AQI value and label
    nodeBAqiValue.textContent = aqiData.value;
    nodeBAqiLabel.textContent = aqiData.label;

    // Update classes for styling
    nodeBAqiLabel.className = "aqi-label " + aqiData.class;
    nodeBCard.className = "node-card " + aqiData.class;
  } else {
    // No data available for Node B
    nodeBStatusElement.textContent = "Offline";
    nodeBStatusElement.classList.add("offline");
    nodeBAqiValue.textContent = "--";
    nodeBAqiLabel.textContent = "No Data";
    nodeBAqiLabel.className = "aqi-label";
    nodeBCard.className = "node-card";
  }
}

// Update charts with new data
function updateCharts(dataByNode) {
  if (!envChart || !historyChart) return;

  try {
    const nodeAData = dataByNode.nodeA || [];
    const nodeBData = dataByNode.nodeB || [];

    // Use the longer dataset's timestamps for charts
    const labels =
      nodeAData.length >= nodeBData.length
        ? nodeAData.map((entry) => formatTimestamp(entry.timestamp))
        : nodeBData.map((entry) => formatTimestamp(entry.timestamp));

    // Process data for Node A
    const temp1 = nodeAData.map((entry) => parseFloat(entry.temperature));
    const humidity1 = nodeAData.map((entry) => parseFloat(entry.humidity));
    const co2_1 = nodeAData.map((entry) => parseFloat(entry.co2));
    const methane1 = nodeAData.map((entry) => parseFloat(entry.methane));

    // Process data for Node B
    const temp2 = nodeBData.map((entry) => parseFloat(entry.temperature));
    const humidity2 = nodeBData.map((entry) => parseFloat(entry.humidity));
    const co2_2 = nodeBData.map((entry) => parseFloat(entry.co2));
    const methane2 = nodeBData.map((entry) => parseFloat(entry.methane));

    // Update Environment Chart
    envChart.data.labels = labels;
    envChart.data.datasets[0].data = temp1;
    envChart.data.datasets[1].data = humidity1;
    envChart.data.datasets[2].data = temp2;
    envChart.data.datasets[3].data = humidity2;

    // Update visibility based on selected node
    envChart.data.datasets[0].hidden = focusedNode === "nodeB";
    envChart.data.datasets[1].hidden = focusedNode === "nodeB";
    envChart.data.datasets[2].hidden = focusedNode === "nodeA";
    envChart.data.datasets[3].hidden = focusedNode === "nodeA";

    if (focusedNode === null) {
      envChart.data.datasets[0].hidden = false;
      envChart.data.datasets[1].hidden = false;
      envChart.data.datasets[2].hidden = false;
      envChart.data.datasets[3].hidden = false;
    }

    envChart.update();

    // Update History Chart
    historyChart.data.labels = labels;
    historyChart.data.datasets[0].data = co2_1;
    historyChart.data.datasets[1].data = methane1;
    historyChart.data.datasets[2].data = co2_2;
    historyChart.data.datasets[3].data = methane2;

    // Update visibility based on selected node
    historyChart.data.datasets[0].hidden = focusedNode === "nodeB";
    historyChart.data.datasets[1].hidden = focusedNode === "nodeB";
    historyChart.data.datasets[2].hidden = focusedNode === "nodeA";
    historyChart.data.datasets[3].hidden = focusedNode === "nodeA";

    if (focusedNode === null) {
      historyChart.data.datasets[0].hidden = false;
      historyChart.data.datasets[1].hidden = false;
      historyChart.data.datasets[2].hidden = false;
      historyChart.data.datasets[3].hidden = false;
    }

    historyChart.update();
  } catch (err) {
    console.error("Error updating charts:", err);
  }
}

// Handle view selection (all nodes or compare view)
function handleViewSelection(viewType) {
  currentView = viewType;

  // Update button states
  viewButtons.forEach((btn) => {
    if (btn.dataset.view === viewType) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Fetch and update data
  fetchAndDisplayData();
}

// Handle node action (focus or history)
function handleNodeAction(node, action) {
  if (action === "focus") {
    focusedNode = node === focusedNode ? null : node; // Toggle focus
    fetchAndDisplayData();
  } else if (action === "history") {
    // Switch to history view for this node
    handleMenuSelection("history");
    // Set the focused node for history view
    focusedNode = node;
    // Load history data
    loadHistoryData();
  }
}

// Handle menu selection
function handleMenuSelection(menuId) {
  // Update UI state
  activeMenu = menuId;

  // Update menu items active state
  sidebarMenuItems.forEach((item) => {
    const link = item.querySelector("a");
    if (link.getAttribute("data-menu") === menuId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Show/hide content sections
  viewContainers.forEach((container) => {
    if (container.classList.contains(menuId + "-view")) {
      container.style.display = "block";
    } else {
      container.style.display = "none";
    }
  });

  // If switching to history, initialize history charts and load data
  if (menuId === "history" && !historyEnvChart) {
    initializeHistoryCharts();
    loadHistoryData();
  }
}

// Handle time range selection in history view
function handleTimeRangeSelection(range) {
  historyTimeRange = range;

  // Update button states
  timeRangeButtons.forEach((btn) => {
    if (btn.dataset.range === range) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Reload history data
  loadHistoryData();
}

// Handle node selection in history view
function handleNodeSelection(nodes) {
  historyNodes = nodes;

  // Update button states
  nodeSelectButtons.forEach((btn) => {
    if (btn.dataset.nodes === nodes) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Reload history data
  loadHistoryData();
}

// Update history charts with data
function updateHistoryCharts(dataByNode) {
  if (!historyEnvChart || !historyCO2Chart || !historyMethaneChart) return;

  const nodeAData = dataByNode.nodeA || [];
  const nodeBData = dataByNode.nodeB || [];

  // Use timestamps from the node with more data points
  const labels =
    nodeAData.length >= nodeBData.length
      ? nodeAData.map((entry) => formatTimestamp(entry.timestamp))
      : nodeBData.map((entry) => formatTimestamp(entry.timestamp));

  // Process data for Node A
  const tempA = nodeAData.map((entry) => parseFloat(entry.temperature));
  const humidityA = nodeAData.map((entry) => parseFloat(entry.humidity));
  const co2A = nodeAData.map((entry) => parseFloat(entry.co2));
  const methaneA = nodeAData.map((entry) => parseFloat(entry.methane));

  // Process data for Node B
  const tempB = nodeBData.map((entry) => parseFloat(entry.temperature));
  const humidityB = nodeBData.map((entry) => parseFloat(entry.humidity));
  const co2B = nodeBData.map((entry) => parseFloat(entry.co2));
  const methaneB = nodeBData.map((entry) => parseFloat(entry.methane));

  // Update Environment Chart
  historyEnvChart.data.labels = labels;
  historyEnvChart.data.datasets[0].data = tempA;
  historyEnvChart.data.datasets[1].data = humidityA;
  historyEnvChart.data.datasets[2].data = tempB;
  historyEnvChart.data.datasets[3].data = humidityB;

  // Update visibility based on selected nodes
  historyEnvChart.data.datasets[0].hidden = historyNodes === "nodeB";
  historyEnvChart.data.datasets[1].hidden = historyNodes === "nodeB";
  historyEnvChart.data.datasets[2].hidden = historyNodes === "nodeA";
  historyEnvChart.data.datasets[3].hidden = historyNodes === "nodeA";

  historyEnvChart.update();

  // Update CO2 Chart
  historyCO2Chart.data.labels = labels;
  historyCO2Chart.data.datasets[0].data = co2A;
  historyCO2Chart.data.datasets[1].data = co2B;

  // Update visibility based on selected nodes
  historyCO2Chart.data.datasets[0].hidden = historyNodes === "nodeB";
  historyCO2Chart.data.datasets[1].hidden = historyNodes === "nodeA";

  historyCO2Chart.update();

  // Update Methane Chart
  historyMethaneChart.data.labels = labels;
  historyMethaneChart.data.datasets[0].data = methaneA;
  historyMethaneChart.data.datasets[1].data = methaneB;

  // Update visibility based on selected nodes
  historyMethaneChart.data.datasets[0].hidden = historyNodes === "nodeB";
  historyMethaneChart.data.datasets[1].hidden = historyNodes === "nodeA";

  historyMethaneChart.update();
}

// Update comparison statistics
function updateComparisonStats(dataByNode) {
  if (!comparisonStatsContainer) return;

  const nodeAData = dataByNode.nodeA || [];
  const nodeBData = dataByNode.nodeB || [];

  // Function to calculate average
  const calculateAvg = (data) => {
    if (data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  };

  // Calculate statistics
  const avgTempA = calculateAvg(
    nodeAData.map((entry) => parseFloat(entry.temperature))
  );
  const avgTempB = calculateAvg(
    nodeBData.map((entry) => parseFloat(entry.temperature))
  );
  const avgHumidityA = calculateAvg(
    nodeAData.map((entry) => parseFloat(entry.humidity))
  );
  const avgHumidityB = calculateAvg(
    nodeBData.map((entry) => parseFloat(entry.humidity))
  );
  const avgCO2A = calculateAvg(nodeAData.map((entry) => parseFloat(entry.co2)));
  const avgCO2B = calculateAvg(nodeBData.map((entry) => parseFloat(entry.co2)));
  const avgMethaneA = calculateAvg(
    nodeAData.map((entry) => parseFloat(entry.methane))
  );
  const avgMethaneB = calculateAvg(
    nodeBData.map((entry) => parseFloat(entry.methane))
  );

  // Calculate differences (Node B - Node A)
  const tempDiff = avgTempB - avgTempA;
  const humidityDiff = avgHumidityB - avgHumidityA;
  const co2Diff = avgCO2B - avgCO2A;
  const methaneDiff = avgMethaneB - avgMethaneA;

  // Create comparison statistics HTML
  comparisonStatsContainer.innerHTML = `
    <div class="stat-item">
      <div class="stat-title">Average Temperature</div>
      <div class="stat-value">Node A: ${avgTempA.toFixed(1)}°C</div>
      <div class="stat-value">Node B: ${avgTempB.toFixed(1)}°C</div>
      <div class="stat-diff ${tempDiff > 0 ? "higher" : "lower"}">
        <i class="fas fa-${tempDiff > 0 ? "arrow-up" : "arrow-down"}"></i>
        Node B is ${Math.abs(tempDiff).toFixed(1)}°C ${
    tempDiff > 0 ? "higher" : "lower"
  }
      </div>
    </div>
    
    <div class="stat-item">
      <div class="stat-title">Average Humidity</div>
      <div class="stat-value">Node A: ${avgHumidityA.toFixed(1)}%</div>
      <div class="stat-value">Node B: ${avgHumidityB.toFixed(1)}%</div>
      <div class="stat-diff ${humidityDiff > 0 ? "higher" : "lower"}">
        <i class="fas fa-${humidityDiff > 0 ? "arrow-up" : "arrow-down"}"></i>
        Node B is ${Math.abs(humidityDiff).toFixed(1)}% ${
    humidityDiff > 0 ? "higher" : "lower"
  }
      </div>
    </div>
    
    <div class="stat-item">
      <div class="stat-title">Average CO₂</div>
      <div class="stat-value">Node A: ${avgCO2A.toFixed(0)} ppm</div>
      <div class="stat-value">Node B: ${avgCO2B.toFixed(0)} ppm</div>
      <div class="stat-diff ${co2Diff > 0 ? "higher" : "lower"}">
        <i class="fas fa-${co2Diff > 0 ? "arrow-up" : "arrow-down"}"></i>
        Node B is ${Math.abs(co2Diff).toFixed(0)} ppm ${
    co2Diff > 0 ? "higher" : "lower"
  }
      </div>
    </div>
    
    <div class="stat-item">
      <div class="stat-title">Average Methane</div>
      <div class="stat-value">Node A: ${avgMethaneA.toFixed(1)} ppm</div>
      <div class="stat-value">Node B: ${avgMethaneB.toFixed(1)} ppm</div>
      <div class="stat-diff ${methaneDiff > 0 ? "higher" : "lower"}">
        <i class="fas fa-${methaneDiff > 0 ? "arrow-up" : "arrow-down"}"></i>
        Node B is ${Math.abs(methaneDiff).toFixed(1)} ppm ${
    methaneDiff > 0 ? "higher" : "lower"
  }
      </div>
    </div>
  `;
}

// Load historical data based on current settings
function loadHistoryData() {
  if (!comparisonStatsContainer) return;

  // Define time ranges
  const now = new Date();
  let startTime;

  switch (historyTimeRange) {
    case "day":
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 1);
      break;
    case "week":
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 7);
      break;
    case "month":
      startTime = new Date(now);
      startTime.setMonth(startTime.getMonth() - 1);
      break;
    default:
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 1);
  }

  // Create timestamp for Firebase query
  const startTimestamp = startTime.toISOString();

  // Execute query
  dataRef
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();

      if (!data) {
        // Handle no data case
        comparisonStatsContainer.innerHTML = `
        <div class="no-data">
          <p><i class="fas fa-exclamation-circle"></i> No historical data available</p>
        </div>
      `;
        return;
      }

      // Process data by node
      let entriesByNode = {
        nodeA: [],
        nodeB: [],
      };

      // Process all data
      Object.keys(data).forEach((mac, index) => {
        const nodeKey = index === 0 ? "nodeA" : "nodeB";
        const macData = data[mac];

        Object.keys(macData).forEach((entryId) => {
          const entryTimestamp = macData[entryId].timestamp;

          // Check if entry is within the selected time range
          if (entryTimestamp >= startTimestamp) {
            const entry = {
              mac: mac,
              id: entryId,
              nodeType: nodeKey,
              ...macData[entryId],
            };

            if (nodeKey === "nodeA") {
              entriesByNode.nodeA.push(entry);
            } else if (nodeKey === "nodeB") {
              entriesByNode.nodeB.push(entry);
            }
          }
        });
      });

      // Sort entries by timestamp (oldest first for charts)
      entriesByNode.nodeA.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });
      entriesByNode.nodeB.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      // Update charts with the data
      updateHistoryCharts(entriesByNode);

      // Generate comparison statistics
      updateComparisonStats(entriesByNode);
    })
    .catch((error) => {
      console.error("Error fetching history data:", error);
      comparisonStatsContainer.innerHTML = `
      <div class="error-message">
        <p><i class="fas fa-exclamation-triangle"></i> Error loading data: ${error.message}</p>
      </div>
    `;
    });
}

// Fetch and display data
function fetchAndDisplayData() {
  if (loadingIndicator) {
    loadingIndicator.style.display = "flex";
  }

  dataRef
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();

      if (!data) {
        if (dataContainer) {
          dataContainer.innerHTML = `
          <div class="no-data">
            <p><i class="fas fa-exclamation-circle"></i> No sensor data available</p>
          </div>
        `;
        }
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
        }
        return;
      }

      // Process data from Firebase
      const macAddresses = Object.keys(data);

      // Assign MAC addresses to nodes if we haven't yet
      if (!nodeMacs.nodeA && macAddresses.length > 0) {
        nodeMacs.nodeA = macAddresses[0];
      }
      if (!nodeMacs.nodeB && macAddresses.length > 1) {
        nodeMacs.nodeB = macAddresses[1];
      }

      let allEntries = [];
      let entriesByNode = {
        nodeA: [],
        nodeB: [],
      };

      // Process all data
      macAddresses.forEach((mac, index) => {
        const nodeKey = index === 0 ? "nodeA" : "nodeB";
        const macData = data[mac];

        Object.keys(macData).forEach((entryId) => {
          const entry = {
            mac: mac,
            id: entryId,
            nodeType: nodeKey,
            ...macData[entryId],
          };

          allEntries.push(entry);

          if (nodeKey === "nodeA") {
            entriesByNode.nodeA.push(entry);
          } else if (nodeKey === "nodeB") {
            entriesByNode.nodeB.push(entry);
          }
        });
      });

      // Sort entries by timestamp (newest first)
      allEntries.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      entriesByNode.nodeA.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      entriesByNode.nodeB.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      // Update the node cards with latest data
      updateNodeCards(entriesByNode);

      // Filter based on current view and focused node
      let filteredEntries;
      if (focusedNode) {
        // Show only the focused node
        filteredEntries = entriesByNode[focusedNode];
      } else if (currentView === "all") {
        // Show all entries
        filteredEntries = allEntries;
      } else if (currentView === "compare") {
        // For compare view, take the most recent entries from each node
        filteredEntries = [];
        if (entriesByNode.nodeA.length > 0)
          filteredEntries.push(entriesByNode.nodeA[0]);
        if (entriesByNode.nodeB.length > 0)
          filteredEntries.push(entriesByNode.nodeB[0]);
      }

      // Take recent entries for display
      const latestEntries = filteredEntries.slice(0, 3);

      // Prepare data for charts (in chronological order)
      const chartDataByNode = {
        nodeA: [...entriesByNode.nodeA].slice(0, 10).reverse(),
        nodeB: [...entriesByNode.nodeB].slice(0, 10).reverse(),
      };

      // Update charts
      updateCharts(chartDataByNode);

      // Update UI with reading cards
      if (dataContainer) {
        dataContainer.innerHTML = "";

        if (latestEntries.length === 0) {
          dataContainer.innerHTML = `
          <div class="no-data">
            <p><i class="fas fa-exclamation-circle"></i> No data available for the selected node</p>
          </div>
        `;
        } else {
          // Create cards for the latest entries
          latestEntries.forEach((entry) => {
            const entryAQI = getAQIFromCO2(entry.co2);
            const cardElement = document.createElement("div");
            cardElement.className = `reading-card ${entryAQI.class}`;

            const nodeName = entry.nodeType === "nodeA" ? "Node A" : "Node B";

            cardElement.innerHTML = `
            <div class="reading-header">
              <div class="reading-device">${nodeName}</div>
              <div class="reading-badge ${entryAQI.class}">${
              entryAQI.label
            }</div>
            </div>
            <div class="reading-data">
              <div class="reading-value">
                <i class="fas fa-temperature-high"></i> Temperature: ${
                  entry.temperature
                } °C
              </div>
              <div class="reading-value">
                <i class="fas fa-tint"></i> Humidity: ${entry.humidity} %
              </div>
              <div class="reading-value">
                <i class="fas fa-cloud"></i> CO₂: ${entry.co2} ppm
              </div>
              <div class="reading-value">
                <i class="fas fa-fire"></i> Methane: ${entry.methane} ppm
              </div>
            </div>
            <div class="reading-timestamp">
              <i class="far fa-clock"></i> ${formatFullTimestamp(
                entry.timestamp
              )}
            </div>
          `;

            dataContainer.appendChild(cardElement);
          });
        }
      }

      // Update summary metrics with the latest entry
      if (latestEntries.length > 0) {
        const latestEntry = latestEntries[0];

        // Update AQI Gauge with the latest CO2 reading
        const aqiData = getAQIFromCO2(latestEntry.co2);
        updateAQIGauge(aqiData);

        // Update Gas Meters
        updateGasMeters(latestEntry.co2, latestEntry.methane);
      }

      updateLastUpdatedTime();

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }
      if (dataContainer) {
        dataContainer.innerHTML = `
        <div class="error-message">
          <p><i class="fas fa-exclamation-triangle"></i> Error loading data: ${error.message}</p>
        </div>
      `;
      }
    });
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", function () {
  initializeCharts();
  updateLastUpdatedTime();
  setInterval(updateLastUpdatedTime, 1000);

  // Setup device selection handlers
  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleViewSelection(btn.dataset.view);
    });
  });

  // Setup node action handlers
  nodeActionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleNodeAction(btn.dataset.node, btn.dataset.action);
    });
  });

  // Setup sidebar menu handlers
  sidebarMenuItems.forEach((item) => {
    const link = item.querySelector("a");
    link.addEventListener("click", (e) => {
      e.preventDefault();
      handleMenuSelection(link.getAttribute("data-menu"));
    });
  });

  // Setup time range selection handlers
  timeRangeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleTimeRangeSelection(btn.dataset.range);
    });
  });

  // Setup node selection handlers
  nodeSelectButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      handleNodeSelection(btn.dataset.nodes);
    });
  });

  // Initial data fetch
  fetchAndDisplayData();

  // Set up real-time updates
  dataRef.on("child_changed", () => {
    fetchAndDisplayData();
  });

  dataRef.on("child_added", () => {
    fetchAndDisplayData();
  });
});

// Handle database errors
dataRef.on("error", (error) => {
  console.error("Database error:", error);
  if (loadingIndicator) {
    loadingIndicator.style.display = "none";
  }
  if (dataContainer) {
    dataContainer.innerHTML = `
      <div class="error-message">
        <p><i class="fas fa-exclamation-triangle"></i> Error loading data: ${error.message}</p>
      </div>
    `;
  }
});

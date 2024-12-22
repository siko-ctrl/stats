// RPC nodes
const NODES = [
    'https://seed01.salvium.io:19081/json_rpc',
    'https://seed02.salvium.io:19081/json_rpc',
    'https://seed03.salvium.io:19081/json_rpc'
];

// Constants for Salvium network
const EMISSION_SPEED_FACTOR = 19;
const DIFFICULTY_TARGET = 120; // 2 minutes
const MONEY_SUPPLY = 18446744073709551615;
const GENESIS_BLOCK_REWARD = 6000000000000;
const MINIMUM_FEE = 100000;
const COIN = 100000000;

// Constants
const REFRESH_INTERVAL = 120000; // 2 minutes
const CHART_POINTS = 20;
const COLORS = {
    primary: '#0AEB85',
    secondary: '#181818',
    white: '#FFFFFF'
};

// Chart configurations
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 750,
        easing: 'easeInOutQuart'
    },
    scales: {
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
                color: COLORS.white
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
                color: COLORS.white
            }
        }
    },
    plugins: {
        legend: {
            display: false
        }
    }
};

// Global state for historical data and node tracking
const historicalData = {
    blockHeight: [],
    hashrate: [],
    difficulty: [],
    totalSupply: []
};

const nodeStatus = [];

// Initialize charts
let blockTimeChart, hashrateChart;
let blockTimeData = [], hashrateData = [];

// Utility functions to log errors to the UI
function displayErrorOnPage(message) {
    const errorDiv = document.getElementById('error-display') || createErrorDisplay();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function createErrorDisplay() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-display';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '10px';
    errorDiv.style.backgroundColor = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.zIndex = '1000';
    document.body.appendChild(errorDiv);
    return errorDiv;
}

// Calculate block reward
function calculateBlockReward(alreadyGeneratedCoins) {
    if (alreadyGeneratedCoins === 0) {
        return GENESIS_BLOCK_REWARD;
    }

    const base_reward = (MONEY_SUPPLY - alreadyGeneratedCoins) >> EMISSION_SPEED_FACTOR;
    return Math.max(base_reward, MINIMUM_FEE);
}

// Calculate supply
function calculateSupply(height) {
    let supply = 0;
    let baseReward = GENESIS_BLOCK_REWARD;
    
    for (let i = 0; i < height; i++) {
        supply += calculateBlockReward(supply);
    }
    
    return supply;
}

// Format hashrate
function formatHashrate(hashrate) {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    
    while (hashrate >= 1000 && unitIndex < units.length - 1) {
        hashrate /= 1000;
        unitIndex++;
    }
    
    return `${hashrate.toFixed(2)} ${units[unitIndex]}`;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format SAL amount
function formatSAL(amount) {
    return (amount / COIN).toFixed(8);
}

// Detailed error logging function
function logError(error, context = '') {
    console.error('=== ERROR DETAILS ===');
    console.error('Context:', context);
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    
    // Additional error properties
    if (error instanceof TypeError) {
        console.error('Error Type Details:', {
            lineNumber: error.lineNumber,
            columnNumber: error.columnNumber,
            fileName: error.fileName
        });
    }
    
    // If it's a network error, log more details
    if (error instanceof Error) {
        console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
    console.error('=== END ERROR DETAILS ===');
}

// Utility function to manage historical data
function updateHistoricalData(dataType, value) {
    console.log(`Updating historical data for ${dataType}:`, value);
    
    // Validate input
    if (!historicalData[dataType]) {
        console.warn(`Invalid data type: ${dataType}`);
        return;
    }
    
    // Ensure value is a number
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        console.warn(`Invalid numeric value for ${dataType}:`, value);
        return;
    }
    
    // Add new data point
    const maxDataPoints = 20; // Limit to last 20 data points
    historicalData[dataType].push({
        timestamp: Date.now(),
        value: numericValue
    });
    
    // Trim historical data if it exceeds max points
    if (historicalData[dataType].length > maxDataPoints) {
        historicalData[dataType].shift();
    }
    
    console.log(`Updated ${dataType} historical data:`, historicalData[dataType]);
    
    // Trigger chart update
    updateCharts();
}

// Initialize charts
function initializeCharts() {
    const ctx1 = document.getElementById('blockTimeChart').getContext('2d');
    const ctx2 = document.getElementById('hashrateChart').getContext('2d');

    blockTimeChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: Array(CHART_POINTS).fill(''),
            datasets: [{
                data: Array(CHART_POINTS).fill(0),
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(10, 235, 133, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: chartOptions
    });

    hashrateChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: Array(CHART_POINTS).fill(''),
            datasets: [{
                data: Array(CHART_POINTS).fill(0),
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(10, 235, 133, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: chartOptions
    });
};

// Format hashrate to human readable format
function formatHashrate(hashrate) {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    
    while (hashrate >= 1000 && unitIndex < units.length - 1) {
        hashrate /= 1000;
        unitIndex++;
    }
    
    return `${hashrate.toFixed(2)} ${units[unitIndex]}`;
};

// Format SAL amount
function formatSAL(amount) {
    return (amount / 1e8).toFixed(2) + ' SAL';
};

// Format time ago
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
};

// Update chart data
function updateCharts(blockTime, hashrate) {
    const timestamp = new Date().toLocaleTimeString();
    
    // Update block time chart
    blockTimeData.push({ x: timestamp, y: blockTime });
    if (blockTimeData.length > CHART_POINTS) blockTimeData.shift();
    
    blockTimeChart.data.labels = blockTimeData.map(point => point.x);
    blockTimeChart.data.datasets[0].data = blockTimeData.map(point => point.y);
    blockTimeChart.update();
    
    // Update hashrate chart
    hashrateData.push({ x: timestamp, y: hashrate });
    if (hashrateData.length > CHART_POINTS) hashrateData.shift();
    
    hashrateChart.data.labels = hashrateData.map(point => point.x);
    hashrateChart.data.datasets[0].data = hashrateData.map(point => point.y);
    hashrateChart.update();
};

// Update network stats
async function updateStats() {
    try {
        // Check status of all nodes
        nodeStatus.length = 0;
        const nodeStatusPromises = NODES.map(checkNodeStatus);
        const nodeResults = await Promise.all(nodeStatusPromises);
        nodeStatus.push(...nodeResults.filter(result => result));
        
        // Update nodes section
        updateNodesSection();
        
        let success = false;
        for (const node of NODES) {
            try {
                console.log(`Trying node: ${node}`);
                
                const infoResponse = await makeRPCCall(node, "get_info", {});
                console.log('get_info response:', infoResponse);
                
                if (infoResponse && infoResponse.result) {
                    const info = infoResponse.result;
                    
                    // Calculate values
                    const blockHeight = info.height;
                    const difficulty = info.difficulty;
                    const hashrate = difficulty / DIFFICULTY_TARGET;
                    const supply = calculateSupply(blockHeight);
                    const reward = calculateBlockReward(supply);
                    
                    // Update UI elements
                    document.getElementById('blockHeight').textContent = formatNumber(blockHeight);
                    document.getElementById('difficulty').textContent = formatNumber(difficulty);
                    document.getElementById('hashrate').textContent = formatHashrate(hashrate);
                    document.getElementById('totalSupply').textContent = `${formatNumber(formatSAL(supply))} SAL`;
                    document.getElementById('networkType').textContent = 'Mainnet';
                    document.getElementById('lastBlock').textContent = new Date().toLocaleString();
                    
                    // Update historical data
                    updateHistoricalData('blockHeight', blockHeight);
                    updateHistoricalData('hashrate', hashrate);
                    updateHistoricalData('totalSupply', supply);
                    
                    // Update yield section
                    const yieldSection = document.getElementById('yieldSection');
                    if (yieldSection) {
                        const yearlyBlocks = (365 * 24 * 60 * 60) / DIFFICULTY_TARGET;
                        const yearlyEmission = yearlyBlocks * reward;
                        const inflationRate = (yearlyEmission / supply) * 100;
                        
                        yieldSection.innerHTML = `
                            <div class="yield-stats">
                                <div class="stat-card">
                                    <i class="fas fa-coins"></i>
                                    <h3>Block Reward</h3>
                                    <p>${formatSAL(reward)} SAL</p>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-chart-line"></i>
                                    <h3>Yearly Emission</h3>
                                    <p>${formatSAL(yearlyEmission)} SAL</p>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-percentage"></i>
                                    <h3>Inflation Rate</h3>
                                    <p>${inflationRate.toFixed(2)}%</p>
                                </div>
                                <div class="stat-card">
                                    <i class="fas fa-piggy-bank"></i>
                                    <h3>Current Supply</h3>
                                    <p>${formatSAL(supply)} SAL</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Update blockchain info
                    const blockchainInfoSection = document.getElementById('blockchainInfo');
                    if (blockchainInfoSection) {
                        blockchainInfoSection.innerHTML = `
                            <div class="info-grid">
                                <div class="info-card">
                                    <i class="fas fa-link"></i>
                                    <h3>Block Height</h3>
                                    <p>${formatNumber(blockHeight)}</p>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-chart-line"></i>
                                    <h3>Network Difficulty</h3>
                                    <p>${formatNumber(difficulty)}</p>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-clock"></i>
                                    <h3>Block Time</h3>
                                    <p>${DIFFICULTY_TARGET} seconds</p>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-network-wired"></i>
                                    <h3>Network Hashrate</h3>
                                    <p>${formatHashrate(hashrate)}</p>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-coins"></i>
                                    <h3>Circulating Supply</h3>
                                    <p>${formatSAL(supply)} SAL</p>
                                </div>
                                <div class="info-card">
                                    <i class="fas fa-globe"></i>
                                    <h3>Network Version</h3>
                                    <p>${info.version || 'Unknown'}</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Update charts
                    updateCharts(info.block_time || 120, hashrate);
                    
                    console.log('Stats updated successfully');
                    success = true;
                    break;
                }
            } catch (error) {
                console.error(`Failed to update stats from node ${node}:`, error);
            }
        }
        
        if (!success) {
            throw new Error('All nodes failed to respond');
        }
        
    } catch (error) {
        console.error('Failed to update stats:', error);
        
        // Clear stats when offline
        const elements = ['blockHeight', 'difficulty', 'hashrate', 'totalSupply', 'networkType', 'lastBlock'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        
        displayErrorOnPage(error.message);
    }
}

// Update nodes section in the UI
function updateNodesSection() {
    const nodesGrid = document.getElementById('nodesGrid');
    if (!nodesGrid) return;

    // Clear existing nodes
    nodesGrid.innerHTML = '';

    // Create node cards
    nodeStatus.forEach(node => {
        const nodeCard = document.createElement('div');
        nodeCard.classList.add('node-card');
        
        const statusColor = node.status === 'online' ? '#4CAF50' : '#ff0000';
        
        nodeCard.innerHTML = `
            <div class="node-status" style="background-color: ${statusColor}"></div>
            <h3>${node.url}</h3>
            <p>Status: ${node.status}</p>
            ${node.status === 'online' ? `
                <p>Block Height: ${formatNumber(node.height)}</p>
                <p>Difficulty: ${formatNumber(node.difficulty)}</p>
                <p>Response Time: ${node.responseTime}ms</p>
            ` : `
                <p>Error: ${node.error}</p>
            `}
            <small>Last Checked: ${new Date(node.lastChecked).toLocaleString()}</small>
        `;
        
        nodesGrid.appendChild(nodeCard);
    });
}

// Make RPC call to a node with retries
async function makeRPCCall(node, method, params = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${retries}: RPC call to ${node} with method: ${method}`);
            
            const requestData = {
                jsonrpc: "2.0",
                id: "0",
                method: method,
                params: params
            };
            
            console.log('Request data:', JSON.stringify(requestData));
            
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData),
                mode: 'cors',
                credentials: 'omit'
            };
            
            console.log('Fetch options:', JSON.stringify(fetchOptions));
            
            const response = await fetch(node, fetchOptions);
            
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                const errorMessage = `JSON Parse Error: ${parseError.message}\nResponse Text: ${responseText}`;
                console.error(errorMessage);
                displayErrorOnPage(errorMessage);
                logError(parseError, 'JSON Parse Error');
                throw parseError;
            }
            
            console.log('Parsed response data:', data);
            
            if (data.error) {
                const errorMessage = `RPC Error: ${JSON.stringify(data.error)}`;
                console.error(errorMessage);
                displayErrorOnPage(errorMessage);
                logError(new Error(errorMessage), 'RPC Error');
                throw new Error(errorMessage);
            }
            
            return data;
        } catch (error) {
            const errorMessage = `Network Error (Attempt ${attempt}): ${error.message}`;
            console.error(errorMessage);
            displayErrorOnPage(errorMessage);
            logError(error, `Network Error (Attempt ${attempt})`);
            
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }
            
            // Exponential backoff with jitter
            const baseDelay = 1000;
            const jitter = Math.random() * 500;
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, 5000);
            
            console.log(`Waiting ${delay}ms before next attempt`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Utility function to track node status
async function checkNodeStatus(node) {
    try {
        const startTime = Date.now();
        const infoResponse = await makeRPCCall(node, "get_info", {});
        const responseTime = Date.now() - startTime;

        if (infoResponse && infoResponse.result) {
            const info = infoResponse.result;
            return {
                url: node,
                status: 'online',
                height: info.height,
                difficulty: info.difficulty,
                responseTime: responseTime,
                lastChecked: new Date().toISOString()
            };
        }
    } catch (error) {
        return {
            url: node,
            status: 'offline',
            error: error.message,
            lastChecked: new Date().toISOString()
        };
    }
}

// Initialize app with periodic updates
function initializeApp() {
    // Initial update immediately
    updateStats();
    
    // Set up periodic updates every 2 minutes (120,000 milliseconds)
    setInterval(updateStats, REFRESH_INTERVAL);
}

// Call initialization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeApp();
});

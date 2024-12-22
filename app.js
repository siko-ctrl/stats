// RPC nodes
const NODES = [
    'https://seed01.salvium.io:19081/json_rpc',
    'https://seed02.salvium.io:19081/json_rpc',
    'https://seed03.salvium.io:19081/json_rpc'
];

// Global state for historical data and node tracking
const historicalData = {
    blockHeight: [],
    hashrate: [],
    difficulty: [],
    totalSupply: []
};

const nodeStatus = [];

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

function formatHashrate(hashrate) {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    while (hashrate >= 1000 && unitIndex < units.length - 1) {
        hashrate /= 1000;
        unitIndex++;
    }
    return `${hashrate.toFixed(2)} ${units[unitIndex]}`;
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
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

// Create or update charts
function updateCharts() {
    console.log('Updating charts...');
    console.log('Historical Data:', historicalData);
    console.log('Window.Chart:', window.Chart);

    // Destroy existing charts to prevent multiple instances
    if (window.blockHeightChartInstance) {
        window.blockHeightChartInstance.destroy();
    }
    if (window.hashrateChartInstance) {
        window.hashrateChartInstance.destroy();
    }

    // Block Height Chart
    const blockHeightChart = document.getElementById('blockHeightChart');
    if (blockHeightChart && window.Chart && historicalData.blockHeight.length > 0) {
        try {
            window.blockHeightChartInstance = new window.Chart(blockHeightChart, {
                type: 'line',
                data: {
                    labels: historicalData.blockHeight.map(d => new Date(d.timestamp).toLocaleTimeString()),
                    datasets: [{
                        label: 'Block Height',
                        data: historicalData.blockHeight.map(d => d.value),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
            console.log('Block Height Chart created successfully');
        } catch (error) {
            console.error('Error creating Block Height Chart:', error);
        }
    } else {
        console.warn('Cannot create Block Height Chart:', {
            chartElement: !!blockHeightChart,
            chartLibrary: !!window.Chart,
            historicalDataLength: historicalData.blockHeight.length
        });
    }

    // Hashrate Chart
    const hashrateChart = document.getElementById('hashrateChart');
    if (hashrateChart && window.Chart && historicalData.hashrate.length > 0) {
        try {
            window.hashrateChartInstance = new window.Chart(hashrateChart, {
                type: 'line',
                data: {
                    labels: historicalData.hashrate.map(d => new Date(d.timestamp).toLocaleTimeString()),
                    datasets: [{
                        label: 'Network Hashrate',
                        data: historicalData.hashrate.map(d => d.value),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Hashrate Chart created successfully');
        } catch (error) {
            console.error('Error creating Hashrate Chart:', error);
        }
    } else {
        console.warn('Cannot create Hashrate Chart:', {
            chartElement: !!hashrateChart,
            chartLibrary: !!window.Chart,
            historicalDataLength: historicalData.hashrate.length
        });
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

// Yield calculation function
function calculateYieldStats(blockHeight) {
    // Placeholder yield calculations - adjust based on actual Salvium tokenomics
    const baseBlockReward = 50; // SAL per block
    const annualBlockCount = 525600; // Blocks per year (assuming 1 block per minute)
    
    const yearlyEmission = baseBlockReward * annualBlockCount;
    const currentSupply = (blockHeight * baseBlockReward) + 1000000; // Initial supply
    
    const inflationRate = (yearlyEmission / currentSupply) * 100;
    
    return {
        blockReward: baseBlockReward,
        yearlyEmission: yearlyEmission,
        currentSupply: currentSupply,
        inflationRate: inflationRate.toFixed(2)
    };
}

// Update yield section in the UI
function updateYieldSection(blockHeight) {
    const yieldStats = calculateYieldStats(blockHeight);
    
    const yieldSection = document.getElementById('yieldSection');
    if (!yieldSection) return;
    
    yieldSection.innerHTML = `
        <div class="yield-stats">
            <div class="stat-card">
                <i class="fas fa-coins"></i>
                <h3>Block Reward</h3>
                <p>${formatNumber(yieldStats.blockReward)} SAL</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-chart-line"></i>
                <h3>Yearly Emission</h3>
                <p>${formatNumber(yieldStats.yearlyEmission)} SAL</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-percentage"></i>
                <h3>Inflation Rate</h3>
                <p>${yieldStats.inflationRate}%</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-piggy-bank"></i>
                <h3>Current Supply</h3>
                <p>${formatNumber(yieldStats.currentSupply)} SAL</p>
            </div>
        </div>
    `;
}

// Blockchain information tracking
function updateBlockchainInfo(info) {
    const blockchainInfoSection = document.getElementById('blockchainInfo');
    if (!blockchainInfoSection) return;
    
    blockchainInfoSection.innerHTML = `
        <div class="info-grid">
            <div class="info-card">
                <i class="fas fa-link"></i>
                <h3>Block Height</h3>
                <p>${formatNumber(info.height)}</p>
            </div>
            <div class="info-card">
                <i class="fas fa-chart-line"></i>
                <h3>Network Difficulty</h3>
                <p>${formatNumber(info.difficulty)}</p>
            </div>
            <div class="info-card">
                <i class="fas fa-clock"></i>
                <h3>Last Block Timestamp</h3>
                <p>${new Date(info.timestamp * 1000).toLocaleString()}</p>
            </div>
            <div class="info-card">
                <i class="fas fa-network-wired"></i>
                <h3>Network Hashrate</h3>
                <p>${formatHashrate(info.difficulty / 120)}</p>
            </div>
            <div class="info-card">
                <i class="fas fa-coins"></i>
                <h3>Circulating Supply</h3>
                <p>${formatNumber((info.height * 50) + 1000000)} SAL</p>
            </div>
            <div class="info-card">
                <i class="fas fa-globe"></i>
                <h3>Network Version</h3>
                <p>${info.version || 'Unknown'}</p>
            </div>
        </div>
    `;
}

// Update network stats
async function updateStats() {
    console.log('=== Starting updateStats ===');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    // Ensure elements exist before using them
    if (!statusDot || !statusText) {
        console.error('Status elements not found in the DOM');
        displayErrorOnPage('Status elements not found');
        return;
    }
    
    try {
        // Check status of all nodes
        nodeStatus.length = 0; // Clear previous node status
        const nodeStatusPromises = NODES.map(checkNodeStatus);
        const nodeResults = await Promise.all(nodeStatusPromises);
        
        // Filter out null/undefined results
        nodeStatus.push(...nodeResults.filter(result => result));
        
        // Update nodes section
        updateNodesSection();
        
        // Try each node until one works
        let success = false;
        for (const node of NODES) {
            try {
                console.log(`Trying node: ${node}`);
                
                // Get network info
                const infoResponse = await makeRPCCall(node, "get_info", {});
                console.log('get_info response:', infoResponse);
                
                if (infoResponse && infoResponse.result) {
                    const info = infoResponse.result;
                    
                    // Safely update UI elements
                    const blockHeightEl = document.getElementById('blockHeight');
                    const difficultyEl = document.getElementById('difficulty');
                    const hashrateEl = document.getElementById('hashrate');
                    const totalSupplyEl = document.getElementById('totalSupply');
                    const networkTypeEl = document.getElementById('networkType');
                    const lastBlockEl = document.getElementById('lastBlock');
                    
                    // Calculate and update values
                    const blockHeight = info.height;
                    const difficulty = info.difficulty;
                    const hashrate = formatHashrate(difficulty / 120);
                    const supply = (blockHeight * 50) + 1000000;
                    
                    // Update DOM elements
                    if (blockHeightEl) {
                        blockHeightEl.textContent = formatNumber(blockHeight);
                        updateHistoricalData('blockHeight', blockHeight);
                    }
                    if (difficultyEl) difficultyEl.textContent = formatNumber(difficulty);
                    if (hashrateEl) {
                        hashrateEl.textContent = hashrate;
                        updateHistoricalData('hashrate', parseFloat(hashrate));
                    }
                    if (totalSupplyEl) {
                        totalSupplyEl.textContent = formatNumber(supply) + ' SAL';
                        updateHistoricalData('totalSupply', supply);
                    }
                    if (networkTypeEl) networkTypeEl.textContent = 'Mainnet';
                    if (lastBlockEl) lastBlockEl.textContent = new Date().toLocaleString();
                    
                    // Update additional sections
                    updateYieldSection(blockHeight);
                    updateBlockchainInfo(info);
                    
                    // Update status
                    statusDot.style.backgroundColor = '#00ff00';
                    statusText.textContent = 'Connected';
                    
                    // Update charts
                    updateCharts();
                    
                    console.log('Stats updated successfully');
                    success = true;
                    break; // Exit after successful update
                }
            } catch (error) {
                console.error(`Failed to update stats from node ${node}:`, error);
                // Continue to next node
            }
        }
        
        // If we get here, all nodes failed
        if (!success) {
            throw new Error('All nodes failed to respond');
        }
        
    } catch (error) {
        console.error('Failed to update stats:', error);
        
        statusDot.style.backgroundColor = '#ff0000';
        statusText.textContent = 'Connection Error';
        
        // Clear stats when offline
        const elements = ['blockHeight', 'difficulty', 'hashrate', 'totalSupply', 'networkType', 'lastBlock'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        
        // Display error to user
        displayErrorOnPage(error.message);
    }
    
    console.log('=== Completed updateStats ===');
}

// Start updates
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting initial update...');
    updateStats();
    // Update every 30 seconds
    setInterval(updateStats, 30000);
});

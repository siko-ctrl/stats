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

// UI Constants
const REFRESH_INTERVAL = 120000; // 2 minutes
const CHART_POINTS = 20;
const COLORS = {
    primary: '#0AEB85',
    secondary: '#181818',
    white: '#FFFFFF',
    background: '#181818'
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
            },
            beginAtZero: true
        }
    },
    plugins: {
        legend: {
            display: false
        }
    }
};

// Chart instances
let blockTimeChart = null;
let hashrateChart = null;
let blockTimeData = [];
let hashrateData = [];

// Format hashrate to human readable format
function formatHashrate(hashrate) {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    
    while (hashrate >= 1000 && unitIndex < units.length - 1) {
        hashrate /= 1000;
        unitIndex++;
    }
    
    return `${hashrate.toFixed(2)} ${units[unitIndex]}`;
}

// Format SAL amount
function formatSAL(amount) {
    return (amount / COIN).toFixed(2) + ' SAL';
}

// Format time ago
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Initialize charts
function initializeCharts() {
    const ctx1 = document.getElementById('blockTimeChart').getContext('2d');
    const ctx2 = document.getElementById('hashrateChart').getContext('2d');

    // Set chart background
    ctx1.canvas.style.backgroundColor = COLORS.background;
    ctx2.canvas.style.backgroundColor = COLORS.background;

    // Initialize with empty data
    const emptyData = Array(CHART_POINTS).fill(0);
    const emptyLabels = Array(CHART_POINTS).fill('');

    blockTimeChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: emptyLabels,
            datasets: [{
                data: emptyData,
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(10, 235, 133, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Block Time (seconds)',
                        color: COLORS.white
                    }
                }
            }
        }
    });

    hashrateChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: emptyLabels,
            datasets: [{
                data: emptyData,
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(10, 235, 133, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                y: {
                    ...chartOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Hashrate',
                        color: COLORS.white
                    }
                }
            }
        }
    });
}

// Update chart data
function updateCharts(blockTime, hashrate) {
    if (!blockTimeChart || !hashrateChart) return;

    const timestamp = new Date().toLocaleTimeString();
    
    // Update block time chart
    blockTimeData.push({ x: timestamp, y: blockTime });
    if (blockTimeData.length > CHART_POINTS) blockTimeData.shift();
    
    blockTimeChart.data.labels = blockTimeData.map(point => point.x);
    blockTimeChart.data.datasets[0].data = blockTimeData.map(point => point.y);
    blockTimeChart.update('none'); // Use 'none' to disable animation for smoother updates
    
    // Update hashrate chart
    hashrateData.push({ x: timestamp, y: hashrate });
    if (hashrateData.length > CHART_POINTS) hashrateData.shift();
    
    hashrateChart.data.labels = hashrateData.map(point => point.x);
    hashrateChart.data.datasets[0].data = hashrateData.map(point => point.y);
    hashrateChart.update('none'); // Use 'none' to disable animation for smoother updates
}

// Make RPC call to a node
async function makeRPCCall(node, method, params = {}) {
    const response = await fetch(node, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: '1',
            method: method,
            params: params
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.result;
}

// Update network stats
async function updateStats() {
    let success = false;
    
    for (const node of NODES) {
        try {
            const info = await makeRPCCall(node, 'get_info');
            
            // Calculate values
            const hashrate = info.difficulty / DIFFICULTY_TARGET;
            const blockTime = info.target || DIFFICULTY_TARGET;
            
            // Update UI
            document.getElementById('blockHeight').textContent = formatNumber(info.height);
            document.getElementById('hashrate').textContent = formatHashrate(hashrate);
            document.getElementById('difficulty').textContent = formatNumber(info.difficulty);
            document.getElementById('totalSupply').textContent = formatSAL(info.already_generated_coins);
            document.getElementById('blockReward').textContent = formatSAL(info.base_reward);
            document.getElementById('lastBlock').textContent = formatTimeAgo(info.timestamp);
            document.getElementById('networkType').textContent = info.mainnet ? 'Mainnet' : 'Testnet';
            
            // Calculate emission rate (daily)
            const emissionRate = (info.base_reward * 720) / info.already_generated_coins * 100;
            document.getElementById('emissionRate').textContent = emissionRate.toFixed(2) + '%';
            
            // Update charts
            updateCharts(blockTime, hashrate);
            
            success = true;
            break;
        } catch (error) {
            console.error(`Failed to fetch from ${node}:`, error);
            continue;
        }
    }
    
    if (!success) {
        console.error('Failed to fetch data from all nodes');
    }
}

// Tab switching logic
document.getElementById('networkLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('networkStats').style.display = 'block';
    document.getElementById('stakingStats').style.display = 'none';
    document.getElementById('networkLink').classList.add('active');
    document.getElementById('stakingLink').classList.remove('active');
});

document.getElementById('stakingLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('networkStats').style.display = 'none';
    document.getElementById('stakingStats').style.display = 'block';
    document.getElementById('networkLink').classList.remove('active');
    document.getElementById('stakingLink').classList.add('active');
});

// Initialize and start updates
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    updateStats();
    setInterval(updateStats, REFRESH_INTERVAL);
});

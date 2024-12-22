// Utility functions
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

// Update the UI with node data
function updateUI(data) {
    // Update network status
    const isNetworkActive = data.length > 0;
    document.querySelector('.status-dot').style.backgroundColor = isNetworkActive ? '#4CAF50' : '#ff0000';
    document.querySelector('.status-text').textContent = isNetworkActive ? 'Network Active' : 'Network Issues';

    if (data.length > 0) {
        // Use the highest values from all nodes
        const highestValues = data.reduce((acc, node) => {
            if (node.info) {
                acc.height = Math.max(acc.height, node.info.height || 0);
                acc.hashrate = Math.max(acc.hashrate, node.info.hashrate || 0);
                acc.difficulty = Math.max(acc.difficulty, node.info.difficulty || 0);
            }
            if (node.supply && node.supply.supply) {
                acc.totalSupply = Math.max(acc.totalSupply, node.supply.supply.total_supply || 0);
            }
            return acc;
        }, { height: 0, hashrate: 0, difficulty: 0, totalSupply: 0 });

        // Update main stats
        document.getElementById('blockHeight').textContent = formatNumber(highestValues.height);
        document.getElementById('hashrate').textContent = formatHashrate(highestValues.hashrate);
        document.getElementById('difficulty').textContent = formatNumber(highestValues.difficulty);
        document.getElementById('totalSupply').textContent = formatNumber(highestValues.totalSupply);

        // Update nodes grid
        const nodesGrid = document.getElementById('nodesGrid');
        nodesGrid.innerHTML = '';
        
        data.forEach(node => {
            const nodeCard = document.createElement('div');
            nodeCard.className = 'node-card';
            nodeCard.innerHTML = `
                <h3>${new URL(node.node).hostname}</h3>
                <p>Height: ${formatNumber(node.info?.height || 0)}</p>
                <p>Connections: ${(node.info?.incoming_connections_count || 0) + (node.info?.outgoing_connections_count || 0)}</p>
                <p>TX Pool: ${node.info?.tx_pool_size || 0}</p>
            `;
            nodesGrid.appendChild(nodeCard);
        });

        // Update yield information if available
        const yieldStats = document.getElementById('yieldStats');
        yieldStats.innerHTML = '';
        
        data.forEach(node => {
            if (node.yield_info?.yield) {
                const yieldCard = document.createElement('div');
                yieldCard.className = 'node-card';
                yieldCard.innerHTML = `
                    <h3>Yield Info</h3>
                    <p>Total Yield: ${formatNumber(node.yield_info.yield.total_yield)}</p>
                    <p>Average Rate: ${node.yield_info.yield.average_yield_rate}%</p>
                `;
                yieldStats.appendChild(yieldCard);
            }
        });
    }
}

// Fetch data from the server
async function fetchData() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        updateUI(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.querySelector('.status-dot').style.backgroundColor = '#ff0000';
        document.querySelector('.status-text').textContent = 'Connection Error';
    }
}

// Initial fetch and set up interval
fetchData();
setInterval(fetchData, 30000); // Update every 30 seconds

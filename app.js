// RPC nodes
const NODES = [
    'https://172.245.110.15.nip.io/json_rpc'  // VPS proxy server with HTTPS
];

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

// Make RPC call to a node with retries
async function makeRPCCall(node, method, params = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const requestData = {
                jsonrpc: "2.0",
                id: "0",
                method: method,
                params: params
            };

            console.log(`Attempt ${attempt}/${retries}: RPC call to ${node} with method: ${method}`);
            
            const response = await fetch(node, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData),
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`Response data for ${method}:`, data);
            
            if (data.error) {
                throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
            }
            
            return data;
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${method}:`, error);
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
        }
    }
}

// Update network stats
async function updateStats() {
    console.log('Starting updateStats...');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    try {
        // Try each node until one works
        for (const node of NODES) {
            try {
                console.log(`Trying node: ${node}`);
                
                // Get network info
                const infoResponse = await makeRPCCall(node, "get_info");
                console.log('get_info response:', infoResponse);
                
                if (infoResponse && infoResponse.result) {
                    const info = infoResponse.result;
                    
                    // Update UI elements
                    document.getElementById('blockHeight').textContent = formatNumber(info.height);
                    document.getElementById('difficulty').textContent = formatNumber(info.difficulty);
                    document.getElementById('hashrate').textContent = formatHashrate(info.difficulty / 120);
                    
                    // Calculate total supply
                    const supply = (info.height * 50) + 1000000;
                    document.getElementById('totalSupply').textContent = formatNumber(supply) + ' SAL';
                    
                    // Update status
                    statusDot.style.backgroundColor = '#00ff00';
                    statusText.textContent = 'Connected';
                    
                    console.log('Stats updated successfully');
                    return; // Exit after successful update
                }
            } catch (error) {
                console.error(`Failed to update stats from node ${node}:`, error);
                // Continue to next node
            }
        }
        
        // If we get here, all nodes failed
        throw new Error('All nodes failed to respond');
        
    } catch (error) {
        console.error('Failed to update stats:', error);
        statusDot.style.backgroundColor = '#ff0000';
        statusText.textContent = 'Connection Error';
        
        // Clear stats when offline
        document.getElementById('blockHeight').textContent = '-';
        document.getElementById('difficulty').textContent = '-';
        document.getElementById('hashrate').textContent = '-';
        document.getElementById('totalSupply').textContent = '-';
    }
}

// Start updates
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting initial update...');
    updateStats();
    // Update every 30 seconds
    setInterval(updateStats, 30000);
});

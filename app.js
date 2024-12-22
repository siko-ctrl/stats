// RPC nodes
const NODES = [
    'https://172.245.110.15.nip.io/json_rpc'  // VPS proxy server with HTTPS
];

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

// Update network stats
async function updateStats() {
    console.log('=== Starting updateStats ===');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    // Ensure elements exist before using them
    if (!statusDot || !statusText) {
        console.error('Status elements not found in the DOM');
        displayErrorOnPage('Status elements not found');
        logError(new Error('Status elements not found'), 'Status Elements Not Found');
        return;
    }
    
    try {
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
                    
                    if (blockHeightEl) blockHeightEl.textContent = formatNumber(info.height);
                    if (difficultyEl) difficultyEl.textContent = formatNumber(info.difficulty);
                    if (hashrateEl) hashrateEl.textContent = formatHashrate(info.difficulty / 120);
                    
                    // Calculate total supply
                    const supply = (info.height * 50) + 1000000;
                    if (totalSupplyEl) totalSupplyEl.textContent = formatNumber(supply) + ' SAL';
                    
                    // Update status
                    statusDot.style.backgroundColor = '#00ff00';
                    statusText.textContent = 'Connected';
                    
                    console.log('Stats updated successfully');
                    success = true;
                    break; // Exit after successful update
                }
            } catch (error) {
                console.error(`Failed to update stats from node ${node}:`, error);
                logError(error, `Failed to Update Stats from Node ${node}`);
                // Continue to next node
            }
        }
        
        // If we get here, all nodes failed
        if (!success) {
            throw new Error('All nodes failed to respond');
        }
        
    } catch (error) {
        console.error('Failed to update stats:', error);
        logError(error, 'Failed to Update Stats');
        
        statusDot.style.backgroundColor = '#ff0000';
        statusText.textContent = 'Connection Error';
        
        // Clear stats when offline
        const elements = ['blockHeight', 'difficulty', 'hashrate', 'totalSupply'];
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

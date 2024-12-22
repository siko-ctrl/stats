require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// RPC nodes
const RPC_NODES = [
    'https://seed01.salvium.io',
    'https://seed02.salvium.io',
    'https://seed03.salvium.io'
];

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// CORS configuration - allow only GitHub Pages domain
const corsOptions = {
    origin: ['https://siko-ctrl.github.io', 'http://localhost:3000'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Helper function to make RPC calls
async function makeRPCCall(node, method, params = {}) {
    try {
        const response = await fetch(`${node}/json_rpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: '0',
                method: method,
                params: params
            })
        });
        return await response.json();
    } catch (error) {
        console.error(`Error calling ${node}: ${error.message}`);
        return null;
    }
}

// Aggregate data from all nodes
async function aggregateNodeData() {
    const results = await Promise.all(RPC_NODES.map(async (node) => {
        const info = await makeRPCCall(node, 'get_info');
        const supply = await makeRPCCall(node, 'get_supply_info');
        const yield_info = await makeRPCCall(node, 'get_yield_info');
        
        return {
            node,
            info: info?.result || null,
            supply: supply?.result || null,
            yield_info: yield_info?.result || null
        };
    }));

    return results.filter(result => result.info !== null);
}

// API endpoint for aggregated stats
app.get('/api/stats', async (req, res) => {
    try {
        const data = await aggregateNodeData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});

const express = require('express');

const app = express();
const port = 8200;
const fetch = require('node-fetch');

app.use(express.json());


app.post('/challenge', async (req, res) => {
    try {
        console.log(req.body);
        const response = await fetch('https://faucet.ghostnet.teztnets.com/challenge', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.send(data);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.post('/verify', async (req, res) => {
    try {
        const response = await fetch('https://faucet.ghostnet.teztnets.com/verify', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.send(data);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
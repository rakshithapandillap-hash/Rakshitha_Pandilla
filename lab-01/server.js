const express = require('express');

const app = express();

// Home route
app.get('/', (req, res) => {
    res.status(200).send('Welcome to Node.js and Express Server');
});

// About route
app.get('/about', (req, res) => {
    res.status(200).json({
        name: 'Rakshitha Pandilla',
        section: 'QE(2B)'
    });
});

// Time route
app.get('/time', (req, res) => {
    res.status(200).json({
        currentDateTime: new Date()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('404 - Page Not Found');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
});
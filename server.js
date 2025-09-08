const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const bookingRoutes = require('./src/routes/bookings');
const adminRoutes = require('./src/routes/admin');
const { initDatabase } = require('./src/database/db');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Maximum 100 requêtes par IP
    message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
});
app.use(limiter);

// Rate limiting spécifique pour les réservations
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // Maximum 5 réservations par heure par IP
    message: 'Trop de réservations depuis cette IP, réessayez dans une heure.'
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques (votre site HTML)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/admin', adminRoutes);

// Route pour servir le site principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Initialisation de la base de données et démarrage du serveur
async function startServer() {
    try {
        await initDatabase();
        console.log('Base de données initialisée');
        
        app.listen(PORT, () => {
            console.log(`🚗 Serveur VTC démarré sur le port ${PORT}`);
            console.log(`📱 Site disponible sur: http://localhost:${PORT}`);
            console.log(`🔧 API disponible sur: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Erreur lors du démarrage:', error);
        process.exit(1);
    }
}

startServer();
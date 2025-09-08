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
const { testEmailConfiguration } = require('./src/services/emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Vérifications au démarrage
console.log('🔧 Vérification de la configuration...');
console.log('PORT:', process.env.PORT);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configuré' : '❌ Manquant');

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

// Route de test pour les emails
app.get('/api/test-email', async (req, res) => {
    try {
        console.log('🧪 Test email demandé...');
        const success = await testEmailConfiguration();
        res.json({
            success,
            message: success ? 'Email de test envoyé !' : 'Erreur de configuration email'
        });
    } catch (error) {
        console.error('Erreur test email:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test email',
            error: error.message
        });
    }
});

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
        console.log('✅ Base de données initialisée');
        
        // Test de la configuration email au démarrage
        console.log('🧪 Test de la configuration SendGrid...');
        try {
            await testEmailConfiguration();
            console.log('✅ Configuration SendGrid validée');
        } catch (emailError) {
            console.warn('⚠️ Problème avec la configuration email:', emailError.message);
            console.warn('   Le serveur va démarrer mais les emails ne fonctionneront pas');
        }
        
        app.listen(PORT, () => {
            console.log(`🚗 Serveur VTC démarré sur le port ${PORT}`);
            console.log(`📱 Site disponible sur: http://localhost:${PORT}`);
            console.log(`🔧 API disponible sur: http://localhost:${PORT}/api`);
            console.log(`📧 Test email: http://localhost:${PORT}/api/test-email`);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage:', error);
        process.exit(1);
    }
}

startServer();
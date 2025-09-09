const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { getDatabase } = require('../database/db');
const { sendBookingConfirmation, sendBookingNotification } = require('../services/emailService');

const router = express.Router();

// Schéma de validation pour les réservations
const bookingSchema = Joi.object({
    pickup: Joi.string().required().min(3).max(200),
    destination: Joi.string().required().min(3).max(200),
    date: Joi.date().iso().required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    passengers: Joi.number().integer().min(1).max(8).default(1),
    serviceType: Joi.string().valid('standard', 'premium', 'business').default('standard'),
    name: Joi.string().required().min(2).max(100),
    phone: Joi.string().required().pattern(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/),
    email: Joi.string().email().allow(''),
    notes: Joi.string().max(500).allow('')
});

// POST - Créer une nouvelle réservation
router.post('/', async (req, res) => {
    console.log('📝 Nouvelle demande de réservation reçue');
    console.log('Données reçues:', JSON.stringify(req.body, null, 2));
    
    try {
        // Validation des données
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log('❌ Erreur de validation:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        console.log('✅ Données validées:', JSON.stringify(value, null, 2));

        // Vérifier que la date n'est pas dans le passé
        const bookingDateTime = moment(`${value.date} ${value.time}`);
        if (bookingDateTime.isBefore(moment())) {
            console.log('❌ Date dans le passé:', bookingDateTime.format());
            return res.status(400).json({
                success: false,
                message: 'La date et heure de réservation ne peuvent pas être dans le passé'
            });
        }

        console.log('✅ Date/heure validée:', bookingDateTime.format());

        const db = getDatabase();
        const query = `
            INSERT INTO bookings (
                pickup, destination, date, time, passengers, 
                serviceType, name, phone, email, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const params = [
            value.pickup,
            value.destination,
            value.date,
            value.time,
            value.passengers,
            value.serviceType,
            value.name,
            value.phone,
            value.email || null,
            value.notes || null
        ];

        console.log('💾 Insertion en base de données...');

        db.run(query, params, async function(err) {
            if (err) {
                console.error('❌ Erreur lors de l\'insertion en BDD:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'enregistrement de la réservation'
                });
            }

            const bookingId = this.lastID;
            console.log(`✅ Réservation enregistrée avec l'ID: ${bookingId}`);

            // Envoyer les emails de confirmation
            console.log('📧 Début envoi des emails...');
            
            // Email client
            if (value.email && value.email.trim() !== '') {
                console.log(`📧 Envoi email de confirmation au client: ${value.email}`);
                try {
                    await sendBookingConfirmation(value, bookingId);
                    console.log('✅ Email client envoyé avec succès');
                } catch (emailError) {
                    console.error('❌ Erreur envoi email client:', emailError);
                    console.error('Détails:', emailError.response?.body || emailError.message);
                }
            } else {
                console.log('⚠️ Pas d\'email client fourni, email de confirmation non envoyé');
            }
            
            // Email admin
            console.log(`📧 Envoi notification admin à: ${process.env.ADMIN_EMAIL}`);
            try {
                await sendBookingNotification(value, bookingId);
                console.log('✅ Email admin envoyé avec succès');
            } catch (emailError) {
                console.error('❌ Erreur envoi email admin:', emailError);
                console.error('Détails:', emailError.response?.body || emailError.message);
            }

            console.log('🎉 Réservation complètement traitée');

            // Réponse au client
            res.status(201).json({
                success: true,
                message: 'Réservation enregistrée avec succès',
                bookingId: bookingId,
                emailSent: value.email ? 'Email de confirmation envoyé' : 'Pas d\'email fourni',
                data: {
                    ...value,
                    id: bookingId,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }
            });
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création de la réservation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

// GET - Récupérer une réservation par ID (pour confirmation)
router.get('/:id', (req, res) => {
    const bookingId = req.params.id;
    
    console.log(`🔍 Recherche réservation ID: ${bookingId}`);
    
    if (!bookingId || isNaN(bookingId)) {
        return res.status(400).json({
            success: false,
            message: 'ID de réservation invalide'
        });
    }

    const db = getDatabase();
    const query = 'SELECT * FROM bookings WHERE id = ?';

    db.get(query, [bookingId], (err, row) => {
        if (err) {
            console.error('❌ Erreur lors de la récupération:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la réservation'
            });
        }

        if (!row) {
            console.log(`❌ Réservation ${bookingId} non trouvée`);
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

        console.log(`✅ Réservation ${bookingId} trouvée`);

        // Ne pas exposer les données sensibles
        const safeBooking = {
            id: row.id,
            pickup: row.pickup,
            destination: row.destination,
            date: row.date,
            time: row.time,
            passengers: row.passengers,
            serviceType: row.serviceType,
            status: row.status,
            createdAt: row.createdAt
        };

        res.json({
            success: true,
            data: safeBooking
        });
    });
});

// GET - Vérifier la disponibilité pour une date/heure
router.get('/availability/:date/:time', (req, res) => {
    const { date, time } = req.params;
    
    console.log(`🕐 Vérification disponibilité: ${date} ${time}`);
    
    // Validation basique
    if (!moment(date).isValid() || !time.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        return res.status(400).json({
            success: false,
            message: 'Date ou heure invalide'
        });
    }

    const db = getDatabase();
    const query = `
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE date = ? AND time = ? AND status IN ('pending', 'confirmed')
    `;

    db.get(query, [date, time], (err, row) => {
        if (err) {
            console.error('❌ Erreur lors de la vérification:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification de disponibilité'
            });
        }

        const isAvailable = row.count === 0;
        console.log(`📅 Disponibilité ${date} ${time}: ${isAvailable ? 'DISPONIBLE' : 'OCCUPÉ'}`);

        res.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? 'Créneau disponible' : 'Créneau déjà réservé'
        });
    });
});

// Route de debug pour tester l'envoi d'email avec les données d'une vraie réservation
router.post('/test-email/:id', async (req, res) => {
    const bookingId = req.params.id;
    
    console.log(`🧪 Test email pour réservation ID: ${bookingId}`);
    
    const db = getDatabase();
    const query = 'SELECT * FROM bookings WHERE id = ?';

    db.get(query, [bookingId], async (err, row) => {
        if (err || !row) {
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

        try {
            console.log('📧 Test envoi email avec données réelles...');
            
            if (row.email) {
                await sendBookingConfirmation(row, bookingId);
                console.log('✅ Email client test envoyé');
            }
            
            await sendBookingNotification(row, bookingId);
            console.log('✅ Email admin test envoyé');
            
            res.json({
                success: true,
                message: 'Emails de test envoyés'
            });
            
        } catch (error) {
            console.error('❌ Erreur test email:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du test email',
                error: error.message
            });
        }
    });
});

module.exports = router;
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

router.post('/', async (req, res) => {
    try {
        // Validation des données
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Vérifier que la date n'est pas dans le passé
        const bookingDateTime = moment(`${value.date} ${value.time}`);
        if (bookingDateTime.isBefore(moment())) {
            return res.status(400).json({
                success: false,
                message: 'La date et heure de réservation ne peuvent pas être dans le passé'
            });
        }

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

        db.run(query, params, function(err) {
            if (err) {
                console.error('Erreur lors de l\'insertion:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'enregistrement de la réservation'
                });
            }

            const bookingId = this.lastID;
            
            // Envoyer les emails de confirmation
            sendBookingConfirmation(value, bookingId)
                .catch(err => console.error('Erreur envoi email client:', err));
            
            sendBookingNotification(value, bookingId)
                .catch(err => console.error('Erreur envoi email admin:', err));

            res.status(201).json({
                success: true,
                message: 'Réservation enregistrée avec succès',
                bookingId: bookingId,
                data: {
                    ...value,
                    id: bookingId,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                }
            });
        });

    } catch (error) {
        console.error('Erreur lors de la création de la réservation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// GET - Récupérer une réservation par ID (pour confirmation)
router.get('/:id', (req, res) => {
    const bookingId = req.params.id;
    
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
            console.error('Erreur lors de la récupération:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la réservation'
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

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
            console.error('Erreur lors de la vérification:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la vérification de disponibilité'
            });
        }

        const isAvailable = row.count === 0; // Supposons qu'on ne peut prendre qu'une réservation à la fois

        res.json({
            success: true,
            available: isAvailable,
            message: isAvailable ? 'Créneau disponible' : 'Créneau déjà réservé'
        });
    });
});

module.exports = router;
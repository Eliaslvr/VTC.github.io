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
    email: Joi.string().email().required(), // Email client obligatoire maintenant
    notes: Joi.string().max(500).allow('')
});

// POST - Créer une nouvelle réservation
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
            value.email,
            value.notes || null
        ];

        db.run(query, params, async function(err) {
            if (err) {
                console.error('Erreur lors de l\'insertion:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de l\'enregistrement de la réservation'
                });
            }

            const bookingId = this.lastID;
            console.log(`📌 Nouvelle réservation créée #${bookingId}`);

            // Envoi email client
            try {
                console.log(`📩 Envoi email client à: ${value.email}`);
                await sendBookingConfirmation(value, bookingId);
                console.log(`✅ Email client envoyé à ${value.email}`);
            } catch (err) {
                console.error('❌ Erreur envoi email client:', err);
            }

            // Envoi email admin
            try {
                console.log(`📩 Envoi notification admin à: ${process.env.ADMIN_EMAIL}`);
                await sendBookingNotification(value, bookingId);
                console.log(`✅ Email admin envoyé à ${process.env.ADMIN_EMAIL}`);
            } catch (err) {
                console.error('❌ Erreur envoi email admin:', err);
            }

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

module.exports = router;

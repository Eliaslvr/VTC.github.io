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

// Utilitaire pour promisifier db.run
function runQuery(db, query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// POST - Créer une nouvelle réservation
router.post('/', async (req, res) => {
    console.log('📝 Nouvelle demande de réservation reçue');
    console.log('Données reçues:', JSON.stringify(req.body, null, 2));

    try {
        // Validation
        const { error, value } = bookingSchema.validate(req.body);
        if (error) {
            console.log('❌ Erreur de validation:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: error.details.map(d => d.message)
            });
        }

        // Vérifier date/heure
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

        // Insertion en BDD
        const bookingId = await runQuery(db, query, params);
        console.log(`✅ Réservation enregistrée avec l'ID: ${bookingId}`);

        // Emails
        try {
            if (value.email && value.email.trim() !== '') {
                console.log(`📧 Envoi email client à ${value.email}`);
                await sendBookingConfirmation(value, bookingId);
                console.log('✅ Email client envoyé');
            }
        } catch (emailError) {
            console.error('❌ Erreur envoi email client:', emailError);
        }

        try {
            console.log(`📧 Envoi notification admin à ${process.env.ADMIN_EMAIL}`);
            await sendBookingNotification(value, bookingId);
            console.log('✅ Email admin envoyé');
        } catch (emailError) {
            console.error('❌ Erreur envoi email admin:', emailError);
        }

        res.status(201).json({
            success: true,
            message: 'Réservation enregistrée avec succès',
            bookingId,
            emailSent: value.email ? 'Email de confirmation envoyé' : 'Pas d\'email fourni',
            data: { ...value, id: bookingId, status: 'pending', createdAt: new Date().toISOString() }
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création de la réservation:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur', error: error.message });
    }
});

module.exports = router;

const sgMail = require('@sendgrid/mail');
const moment = require('moment');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email de confirmation pour le client
async function sendBookingConfirmation(bookingData, bookingId) {
    if (!bookingData.email) return;

    const serviceTypes = {
        standard: "Standard",
        premium: "Premium",
        business: "Business"
    };

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">🚗 VTC Premium</h1>
                <h2 style="margin: 10px 0 0 0; font-weight: normal;">Confirmation de réservation</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
                <p style="font-size: 18px; color: #28a745; font-weight: bold;">
                    ✅ Votre réservation a été enregistrée avec succès !
                </p>
                
                <div style="background: white; padding: 25px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Détails de votre course</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">N° :</td><td>#${bookingId}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Nom :</td><td>${bookingData.name}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Départ :</td><td>${bookingData.pickup}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Destination :</td><td>${bookingData.destination}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Date :</td><td>${moment(bookingData.date).format('DD/MM/YYYY')}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Heure :</td><td>${bookingData.time}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Passagers :</td><td>${bookingData.passengers}</td></tr>
                        <tr><td style="padding: 8px 0; font-weight: bold; color: #555;">Service :</td><td>${serviceTypes[bookingData.serviceType]}</td></tr>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        await sgMail.send({
            to: bookingData.email,
            from: process.env.FROM_EMAIL,
            subject: `Confirmation réservation #${bookingId} - VTC Nord`,
            html: emailHtml
        });
        console.log(`Email de confirmation envoyé à ${bookingData.email}`);
    } catch (err) {
        console.error("Erreur envoi email client :", err);
    }
}

// Email de notification pour l'admin
async function sendBookingNotification(bookingData, bookingId) {
    if (!process.env.ADMIN_EMAIL) return;

    const serviceTypes = {
        standard: "Standard",
        premium: "Premium",
        business: "Business"
    };

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #333; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">🚨 Nouvelle réservation reçue</h2>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
                <p>Une nouvelle réservation a été faite sur ton site VTC :</p>
                <ul style="list-style: none; padding: 0;">
                    <li><strong>N° :</strong> #${bookingId}</li>
                    <li><strong>Nom :</strong> ${bookingData.name}</li>
                    <li><strong>Téléphone :</strong> ${bookingData.phone}</li>
                    <li><strong>Email :</strong> ${bookingData.email || "Non fourni"}</li>
                    <li><strong>Départ :</strong> ${bookingData.pickup}</li>
                    <li><strong>Destination :</strong> ${bookingData.destination}</li>
                    <li><strong>Date :</strong> ${bookingData.date}</li>
                    <li><strong>Heure :</strong> ${bookingData.time}</li>
                    <li><strong>Passagers :</strong> ${bookingData.passengers}</li>
                    <li><strong>Service :</strong> ${serviceTypes[bookingData.serviceType]}</li>
                    <li><strong>Notes :</strong> ${bookingData.notes || "Aucune"}</li>
                </ul>
            </div>
        </div>
    `;

    try {
        await sgMail.send({
            to: process.env.ADMIN_EMAIL,
            from: process.env.FROM_EMAIL,
            subject: `Nouvelle réservation #${bookingId}`,
            html: emailHtml
        });
        console.log(`Notification admin envoyée à ${process.env.ADMIN_EMAIL}`);
    } catch (err) {
        console.error("Erreur envoi notification admin :", err);
    }
}

module.exports = { sendBookingConfirmation, sendBookingNotification };

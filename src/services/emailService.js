const nodemailer = require('nodemailer');
const moment = require('moment');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Ton email
        pass: process.env.EMAIL_PASS  // Mot de passe d'application Gmail
    }
});

// Alternative avec SMTP personnalisé
/*
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
*/

// Email de confirmation pour le client
async function sendBookingConfirmation(bookingData, bookingId) {
    try {
        if (!bookingData.email) {
            console.log('Pas d\'email client fourni, confirmation non envoyée');
            return;
        }

        const serviceTypes = {
            'standard': 'Standard',
            'premium': 'Premium',
            'business': 'Business'
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
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">N° de réservation :</td>
                                <td style="padding: 8px 0;">#${bookingId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Départ :</td>
                                <td style="padding: 8px 0;">${bookingData.pickup}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Destination :</td>
                                <td style="padding: 8px 0;">${bookingData.destination}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Date :</td>
                                <td style="padding: 8px 0;">${moment(bookingData.date).format('DD/MM/YYYY')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Heure :</td>
                                <td style="padding: 8px 0;">${bookingData.time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Passagers :</td>
                                <td style="padding: 8px 0;">${bookingData.passengers}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Service :</td>
                                <td style="padding: 8px 0;">${serviceTypes[bookingData.serviceType]}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 16px; color: #555;">
                        Merci d’avoir choisi VTC Premium. Nous vous souhaitons une excellente course !
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: `"VTC Premium" <${process.env.EMAIL_USER}>`,
            to: bookingData.email,
            subject: 'Confirmation de votre réservation',
            html: emailHtml
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email de confirmation envoyé à ${bookingData.email}`);
    } catch (error) {
        console.error('Erreur lors de l’envoi de l’email :', error);
    }
}

// Email de notification pour l'admin
async function sendBookingNotification(bookingData, bookingId) {
    try {
        if (!process.env.ADMIN_EMAIL) {
            console.log("Pas d'email admin défini, notification non envoyée");
            return;
        }

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
                    <p style="font-size: 16px; color: #333;">
                        Une nouvelle réservation a été faite sur ton site VTC :
                    </p>

                    <div style="background: white; padding: 15px; border-radius: 8px;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
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
            </div>
        `;

        const mailOptions = {
            from: `"VTC Premium" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL, // défini dans ton .env
            subject: `Nouvelle réservation #${bookingId}`,
            html: emailHtml
        };

        await transporter.sendMail(mailOptions);
        console.log(`Notification envoyée à l’admin : ${process.env.ADMIN_EMAIL}`);
    } catch (error) {
        console.error("Erreur lors de l’envoi de la notification admin :", error);
    }
}


module.exports = { sendBookingConfirmation, sendBookingNotification };

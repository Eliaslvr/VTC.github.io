const sgMail = require('@sendgrid/mail');
const moment = require('moment');

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
                            ${bookingData.notes ? `
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #555;">Notes :</td>
                                <td style="padding: 8px 0;">${bookingData.notes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    <div style="background: #e8f4fd; padding: 20px; border-radius: 10px; border-left: 4px solid #007bff;">
                        <h4 style="margin: 0 0 10px 0; color: #007bff;">📞 Que se passe-t-il maintenant ?</h4>
                        <p style="margin: 0; color: #555;">
                            Nous allons vous contacter sous peu au <strong>${bookingData.phone}</strong> pour confirmer votre réservation 
                            et vous communiquer les détails du chauffeur.
                        </p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-left: 4px solid #ffc107; margin-top: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Important</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #555;">
                            <li>Soyez prêt 5 minutes avant l'heure de prise en charge</li>
                            <li>Gardez votre téléphone allumé le jour J</li>
                            <li>En cas d'empêchement, contactez-nous au plus tôt</li>
                        </ul>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center;">
                    <h3 style="margin: 0 0 15px 0;">Contact</h3>
                    <p style="margin: 5px 0;">📞 <strong>06 12 34 56 78</strong></p>
                    <p style="margin: 5px 0;">✉️ <strong>contact@vtcpremium.fr</strong></p>
                    <p style="margin: 5px 0; font-size: 14px; opacity: 0.8;">Disponible 24h/24, 7j/7</p>
                </div>
                
                <div style="padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    <p>Merci de votre confiance !</p>
                </div>
            </div>
        `;

        const msg = {
            to: bookingData.email,
            from: {
                email: process.env.FROM_EMAIL,
                name: 'VTC Premium',
            },
            subject: `Confirmation de réservation VTC #${bookingId}`,
            html: emailHtml,
        };

        await sgMail.send(msg);
        console.log(`✅ Email de confirmation envoyé à ${bookingData.email}`);

    } catch (error) {
        console.error('❌ Erreur envoi email confirmation:', error);
        
        if (error.response) {
            console.error('Détails de l\'erreur SendGrid:', error.response.body);
        }
        
        throw error;
    }
}

// Email de notification pour l'admin
async function sendBookingNotification(bookingData, bookingId) {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            console.log('Email admin non configuré, notification non envoyée');
            return;
        } 

        const serviceTypes = {
            'standard': 'Standard',
            'premium': 'Premium',
            'business': 'Business'
        };

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">🚨 Nouvelle réservation VTC</h1>
                </div>
                
                <div style="padding: 20px; background: #f8f9fa;">
                    <h2 style="color: #dc3545;">Réservation #${bookingId}</h2>
                    <p style="font-size: 16px;"><strong>Reçue le :</strong> ${moment().format('DD/MM/YYYY à HH:mm')}</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #333;">Détails de la course</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Départ :</td>
                                <td style="padding: 5px 0;">${bookingData.pickup}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Destination :</td>
                                <td style="padding: 5px 0;">${bookingData.destination}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Date :</td>
                                <td style="padding: 5px 0;">${moment(bookingData.date).format('DD/MM/YYYY')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Heure :</td>
                                <td style="padding: 5px 0;">${bookingData.time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Passagers :</td>
                                <td style="padding: 5px 0;">${bookingData.passengers}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Service :</td>
                                <td style="padding: 5px 0;">${serviceTypes[bookingData.serviceType]}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #333;">Informations client</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Nom :</td>
                                <td style="padding: 5px 0;">${bookingData.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Téléphone :</td>
                                <td style="padding: 5px 0;"><a href="tel:${bookingData.phone}">${bookingData.phone}</a></td>
                            </tr>
                            ${bookingData.email ? `
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Email :</td>
                                <td style="padding: 5px 0;"><a href="mailto:${bookingData.email}">${bookingData.email}</a></td>
                            </tr>
                            ` : ''}
                            ${bookingData.notes ? `
                            <tr>
                                <td style="padding: 5px 0; font-weight: bold;">Notes :</td>
                                <td style="padding: 5px 0;">${bookingData.notes}</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; color: #856404;">
                            <strong>Action requise :</strong> Contactez le client pour confirmer la réservation et organiser la prise en charge.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="tel:${bookingData.phone}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">📞 Appeler le client</a>
                    </div>
                </div>
            </div>
        `;

        const msg = {
            to: adminEmail,
            from: {
                email: process.env.FROM_EMAIL || 'eliaslvr59@gmail.com',
                name: 'Système VTC'
            },
            subject: `🚨 Nouvelle réservation #${bookingId} - ${bookingData.name}`,
            html: emailHtml,
        };

        await sgMail.send(msg);
        console.log(`✅ Notification admin envoyée à ${adminEmail}`);

    } catch (error) {
        console.error('❌ Erreur envoi notification admin:', error);
        
        if (error.response) {
            console.error('Détails de l\'erreur SendGrid:', error.response.body);
        }
        
        throw error;
    }
}

// Fonction utilitaire pour tester la configuration SendGrid
async function testEmailConfiguration() {
    try {
        const testMsg = {
            to: process.env.ADMIN_EMAIL,
            from: {
                email: process.env.FROM_EMAIL,
                name: 'VTC'
            },
            subject: 'Test de configuration SendGrid',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>✅ Configuration SendGrid réussie !</h2>
                    <p>Votre service email fonctionne correctement.</p>
                    <p>Timestamp: ${new Date().toLocaleString('fr-FR')}</p>
                </div>
            `,
        };

        await sgMail.send(testMsg);
        console.log('✅ Configuration SendGrid validée - Email de test envoyé');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur configuration SendGrid:', error);
        
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response.body);
        }
        
        return false;
    }
}

module.exports = {
    sendBookingConfirmation,
    sendBookingNotification,
    testEmailConfiguration
};
// Définir la date minimale à aujourd'hui
document.getElementById('date').min = new Date().toISOString().split('T')[0];

// Gestion du formulaire de réservation
document.getElementById('reservationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Récupération des données du formulaire
    const formData = new FormData(this);
    const bookingData = {};
    for (let [key, value] of formData.entries()) {
        bookingData[key] = value;
    }
    
    // Validation simple
    if (!bookingData.pickup || !bookingData.destination || !bookingData.date || 
        !bookingData.time || !bookingData.name || !bookingData.phone) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    } else {
        alert('Réservation effectué')
    }
    
    // Affichage de la confirmation
    displayConfirmation(bookingData);
});

function displayConfirmation(data) {
    // Masquer le formulaire et afficher la confirmation
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('confirmation').style.display = 'block';
    
    // Formatage des détails de la réservation
    const serviceTypes = {
        'standard': 'Standard',
        'premium': 'Premium',
        'business': 'Business'
    };
    
    const bookingHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left;">
            <div><strong>Départ :</strong></div>
            <div>${data.pickup}</div>
            
            <div><strong>Destination :</strong></div>
            <div>${data.destination}</div>
            
            <div><strong>Date :</strong></div>
            <div>${new Date(data.date).toLocaleDateString('fr-FR')}</div>
            
            <div><strong>Heure :</strong></div>
            <div>${data.time}</div>
            
            <div><strong>Passagers :</strong></div>
            <div>${data.passengers}</div>
            
            <div><strong>Service :</strong></div>
            <div>${serviceTypes[data.serviceType]}</div>
            
            <div><strong>Nom :</strong></div>
            <div>${data.name}</div>
            
            <div><strong>Téléphone :</strong></div>
            <div>${data.phone}</div>
            
            ${data.email ? `<div><strong>Email :</strong></div><div>${data.email}</div>` : ''}
            
            ${data.notes ? `<div><strong>Notes :</strong></div><div>${data.notes}</div>` : ''}
        </div>
    `;
    
    document.getElementById('bookingDetails').innerHTML = bookingHTML;
    
    // Scroll vers la confirmation
    document.getElementById('confirmation').scrollIntoView({ behavior: 'smooth' });
}

function newBooking() {
    // Réinitialiser le formulaire
    document.getElementById('reservationForm').reset();
    document.getElementById('date').min = new Date().toISOString().split('T')[0];
    
    // Afficher le formulaire et masquer la confirmation
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('confirmation').style.display = 'none';
    
    // Scroll vers le formulaire
    document.getElementById('reservation').scrollIntoView({ behavior: 'smooth' });
}

// Animation au scroll
window.addEventListener('scroll', function() {
    const cards = document.querySelectorAll('.service-card');
    cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        const cardVisible = 150;
        
        if (cardTop < window.innerHeight - cardVisible) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
});

// Navigation fluide
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
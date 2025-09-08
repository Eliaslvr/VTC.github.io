const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'vtc_bookings.db');

let db = null;

// Initialiser la base de données
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Erreur lors de l\'ouverture de la base de données:', err);
                reject(err);
            } else {
                console.log('Connexion à la base de données SQLite établie');
                createTables().then(resolve).catch(reject);
            }
        });
    });
}

// Créer les tables
function createTables() {
    return new Promise((resolve, reject) => {
        const createBookingsTable = `
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pickup TEXT NOT NULL,
                destination TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                passengers INTEGER DEFAULT 1,
                serviceType TEXT DEFAULT 'standard',
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                notes TEXT,
                status TEXT DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createAdminTable = `
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        db.run(createBookingsTable, (err) => {
            if (err) {
                reject(err);
                return;
            }

            db.run(createAdminTable, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log('Tables créées avec succès');
                resolve();
            });
        });
    });
}

// Obtenir l'instance de la base de données
function getDatabase() {
    return db;
}

// Fermer la base de données
function closeDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Base de données fermée');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase
};
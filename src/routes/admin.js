const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/db');

const router = express.Router();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token d\'accès requis'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'vtc_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token invalide'
            });
        }
        req.user = user;
        next();
    });
};

// POST - Connexion admin
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur et mot de passe requis'
            });
        }

        const db = getDatabase();
        const query = 'SELECT * FROM admin_users WHERE username = ?';

        db.get(query, [username], async (err, user) => {
            if (err) {
                console.error('Erreur de connexion:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur interne'
                });
            }

            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({
                    success: false,
                    message: 'Identifiants incorrects'
                });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                process.env.JWT_SECRET || 'vtc_secret_key',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// POST - Créer un compte admin (à utiliser une seule fois)
router.post('/create-admin', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur et mot de passe requis'
            });
        }

        // Vérifier si un admin existe déjà
        const db = getDatabase();
        db.get('SELECT COUNT(*) as count FROM admin_users', (err, row) => {
            if (err) {
                console.error('Erreur:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur interne'
                });
            }

            if (row.count > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Un administrateur existe déjà'
                });
            }

            // Créer le hash du mot de passe
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Erreur de hashage:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erreur interne'
                    });
                }

                const insertQuery = 'INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)';
                db.run(insertQuery, [username, hashedPassword, email], function(err) {
                    if (err) {
                        console.error('Erreur d\'insertion:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Erreur lors de la création du compte'
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Compte administrateur créé avec succès',
                        adminId: this.lastID
                    });
                });
            });
        });

    } catch (error) {
        console.error('Erreur lors de la création admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur'
        });
    }
});

// GET - Récupérer toutes les réservations (protégé)
router.get('/bookings', authenticateToken, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let query = 'SELECT * FROM bookings';
    let countQuery = 'SELECT COUNT(*) as total FROM bookings';
    const params = [];

    if (status) {
        query += ' WHERE status = ?';
        countQuery += ' WHERE status = ?';
        params.push(status);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const db = getDatabase();

    // Compter le total
    db.get(countQuery, status ? [status] : [], (err, countRow) => {
        if (err) {
            console.error('Erreur de comptage:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors du comptage des réservations'
            });
        }

        // Récupérer les réservations
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Erreur de récupération:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération des réservations'
                });
            }

            res.json({
                success: true,
                data: rows,
                pagination: {
                    page,
                    limit,
                    total: countRow.total,
                    totalPages: Math.ceil(countRow.total / limit)
                }
            });
        });
    });
});

// PUT - Mettre à jour le statut d'une réservation (protégé)
router.put('/bookings/:id', authenticateToken, (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Statut invalide'
        });
    }

    const db = getDatabase();
    const query = 'UPDATE bookings SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';

    db.run(query, [status, bookingId], function(err) {
        if (err) {
            console.error('Erreur de mise à jour:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Réservation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Statut mis à jour avec succès'
        });
    });
});

// GET - Statistiques dashboard (protégé)
router.get('/stats', authenticateToken, (req, res) => {
    const db = getDatabase();
    
    const queries = {
        totalBookings: 'SELECT COUNT(*) as count FROM bookings',
        pendingBookings: 'SELECT COUNT(*) as count FROM bookings WHERE status = "pending"',
        confirmedBookings: 'SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"',
        todayBookings: 'SELECT COUNT(*) as count FROM bookings WHERE date = date("now")',
        recentBookings: 'SELECT * FROM bookings ORDER BY createdAt DESC LIMIT 5'
    };

    const stats = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        if (key === 'recentBookings') {
            db.all(query, (err, rows) => {
                if (err) {
                    console.error(`Erreur ${key}:`, err);
                    stats[key] = [];
                } else {
                    stats[key] = rows;
                }
                
                completed++;
                if (completed === totalQueries) {
                    res.json({
                        success: true,
                        data: stats
                    });
                }
            });
        } else {
            db.get(query, (err, row) => {
                if (err) {
                    console.error(`Erreur ${key}:`, err);
                    stats[key] = 0;
                } else {
                    stats[key] = row.count;
                }
                
                completed++;
                if (completed === totalQueries) {
                    res.json({
                        success: true,
                        data: stats
                    });
                }
            });
        }
    });
});

module.exports = router;
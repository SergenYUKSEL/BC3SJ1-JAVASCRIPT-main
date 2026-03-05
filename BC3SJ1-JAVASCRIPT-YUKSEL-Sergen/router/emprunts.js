require('dotenv').config()
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const db = require('./../services/database')

const JWT_SECRET = process.env.JWT_SECRET

function authenticateToken(req, res, next) {
    const token = req.cookies.token
    if (!token) return res.sendStatus(401)

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès interdit' })
    }
    next()
}

// POST /api/emprunts — emprunter un livre
router.post('/', authenticateToken, (req, res) => {
    const { livre_id } = req.body
    const utilisateur_id = req.user.id

    // Vérifier que le livre est disponible
    db.query('SELECT statut FROM livres WHERE id = ?', [livre_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur SQL' })
        if (results.length === 0) return res.status(404).json({ message: 'Livre non trouvé' })
        if (results[0].statut !== 'disponible') {
            return res.status(400).json({ message: 'Livre non disponible' })
        }

        const dateRetourPrevue = new Date()
        dateRetourPrevue.setDate(dateRetourPrevue.getDate() + 30)
        const dateRetourStr = dateRetourPrevue.toISOString().split('T')[0]

        db.query(
            'INSERT INTO emprunts (livre_id, utilisateur_id, date_retour_prevue) VALUES (?, ?, ?)',
            [livre_id, utilisateur_id, dateRetourStr],
            (err) => {
                if (err) return res.status(500).json({ message: 'Erreur SQL' })

                db.query("UPDATE livres SET statut = 'emprunté' WHERE id = ?", [livre_id], (err) => {
                    if (err) return res.status(500).json({ message: 'Erreur SQL' })
                    res.json({ message: 'Emprunt enregistré', date_retour_prevue: dateRetourStr })
                })
            }
        )
    })
})

// GET /api/emprunts/mes-emprunts — historique de l'utilisateur connecté
router.get('/mes-emprunts', authenticateToken, (req, res) => {
    const utilisateur_id = req.user.id
    const sql = `
        SELECT e.*, l.titre, l.auteur, l.photo_url
        FROM emprunts e
        JOIN livres l ON e.livre_id = l.id
        WHERE e.utilisateur_id = ?
        ORDER BY e.date_emprunt DESC
    `
    db.query(sql, [utilisateur_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur SQL' })
        res.json(results)
    })
})

// PUT /api/emprunts/:id/retour — signaler un retour (en attente validation admin)
router.put('/:id/retour', authenticateToken, (req, res) => {
    const empruntId = req.params.id
    const utilisateur_id = req.user.id

    db.query(
        "SELECT * FROM emprunts WHERE id = ? AND utilisateur_id = ? AND statut IN ('en cours', 'en retard')",
        [empruntId, utilisateur_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Erreur SQL' })
            if (results.length === 0) return res.status(404).json({ message: 'Emprunt non trouvé' })

            db.query(
                "UPDATE emprunts SET statut = 'retour demandé' WHERE id = ?",
                [empruntId],
                (err) => {
                    if (err) return res.status(500).json({ message: 'Erreur SQL' })
                    res.json({ message: 'Demande de retour envoyée, en attente de validation' })
                }
            )
        }
    )
})

// PUT /api/emprunts/:id/valider-retour — admin accepte le retour
router.put('/:id/valider-retour', authenticateToken, isAdmin, (req, res) => {
    const empruntId = req.params.id

    db.query(
        "SELECT * FROM emprunts WHERE id = ? AND statut = 'retour demandé'",
        [empruntId],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Erreur SQL' })
            if (results.length === 0) return res.status(404).json({ message: 'Emprunt non trouvé' })

            const emprunt = results[0]
            const today = new Date().toISOString().split('T')[0]

            db.query(
                "UPDATE emprunts SET statut = 'retourné', date_retour_effective = ? WHERE id = ?",
                [today, empruntId],
                (err) => {
                    if (err) return res.status(500).json({ message: 'Erreur SQL' })

                    db.query("UPDATE livres SET statut = 'disponible' WHERE id = ?", [emprunt.livre_id], (err) => {
                        if (err) return res.status(500).json({ message: 'Erreur SQL' })
                        res.json({ message: 'Retour validé' })
                    })
                }
            )
        }
    )
})

// PUT /api/emprunts/:id/refuser-retour — admin refuse le retour
router.put('/:id/refuser-retour', authenticateToken, isAdmin, (req, res) => {
    const empruntId = req.params.id

    db.query(
        "UPDATE emprunts SET statut = 'en cours' WHERE id = ? AND statut = 'retour demandé'",
        [empruntId],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Erreur SQL' })
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Emprunt non trouvé' })
            res.json({ message: 'Retour refusé, emprunt remis en cours' })
        }
    )
})

// GET /api/emprunts — tous les emprunts (admin)
router.get('/', authenticateToken, isAdmin, (_, res) => {
    const sql = `
        SELECT e.*, l.titre, l.auteur, u.nom, u.prenom, u.email
        FROM emprunts e
        JOIN livres l ON e.livre_id = l.id
        JOIN utilisateurs u ON e.utilisateur_id = u.id
        ORDER BY e.date_emprunt DESC
    `
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur SQL' })
        res.json(results)
    })
})

module.exports = router

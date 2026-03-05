const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const db = require('./../services/database')

const JWT_SECRET = "HelloThereImObiWan"

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

// PUT /api/emprunts/:id/retour — signaler un retour
router.put('/:id/retour', authenticateToken, (req, res) => {
    const empruntId = req.params.id
    const utilisateur_id = req.user.id

    db.query(
        'SELECT * FROM emprunts WHERE id = ? AND utilisateur_id = ?',
        [empruntId, utilisateur_id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Erreur SQL' })
            if (results.length === 0) return res.status(404).json({ message: 'Emprunt non trouvé' })

            const emprunt = results[0]
            const today = new Date().toISOString().split('T')[0]

            db.query(
                "UPDATE emprunts SET date_retour_effective = ?, statut = 'retourné' WHERE id = ?",
                [today, empruntId],
                (err) => {
                    if (err) return res.status(500).json({ message: 'Erreur SQL' })

                    db.query("UPDATE livres SET statut = 'disponible' WHERE id = ?", [emprunt.livre_id], (err) => {
                        if (err) return res.status(500).json({ message: 'Erreur SQL' })
                        res.json({ message: 'Retour enregistré' })
                    })
                }
            )
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

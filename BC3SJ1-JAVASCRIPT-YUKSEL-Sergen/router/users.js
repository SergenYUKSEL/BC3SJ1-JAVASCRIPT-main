require('dotenv').config()
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const db = require('./../services/database')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET manquant dans .env')

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

// Rate limiting : max 10 tentatives de login / 15 min par IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Trop de tentatives, réessayez dans 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false
})

router
.get('/', authenticateToken, isAdmin, (_, res) => {
    const sql = 'SELECT id, nom, prenom, email, date_inscription, role FROM utilisateurs'
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' })
        res.json(results)
    })
})

.post('/register', async (req, res) => {
    const { name, prenom, email, password } = req.body
    if (!name || !prenom || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis' })
    }
    if (password.length < 8) {
        return res.status(400).json({ message: 'Mot de passe trop court (8 caractères min)' })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const sql = 'INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)'
    db.query(sql, [name, prenom, email, hashedPassword, 'utilisateur'], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email déjà utilisé' })
            return res.status(500).json({ message: 'Erreur serveur' })
        }
        res.json({ message: 'Utilisateur enregistré' })
    })
})

.post('/login', loginLimiter, (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis' })
    }
    const sql = 'SELECT * FROM utilisateurs WHERE email = ?'
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' })
        if (results.length === 0) {
            return res.status(400).json({ message: 'Identifiants incorrects' })
        }
        const user = results[0]
        const isMatch = await bcrypt.compare(password, user.mot_de_passe)
        if (!isMatch) {
            return res.status(400).json({ message: 'Identifiants incorrects' })
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '2h' }
        )
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })
        // En développement : token renvoyé dans le body pour faciliter les tests Postman
        // En production : cookie httpOnly suffit, token absent du body
        const response = { message: 'Connexion réussie' }
        if (process.env.NODE_ENV !== 'production') {
            response.token = token
        }
        res.json(response)
    })
})

.put('/:id', authenticateToken, (req, res) => {
    const targetId = parseInt(req.params.id)
    // Un utilisateur ne peut modifier que son propre profil, sauf admin
    if (req.user.id !== targetId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès interdit' })
    }
    const { nom, prenom, email } = req.body
    // Seul un admin peut changer le rôle
    const role = req.user.role === 'admin' ? req.body.role : undefined
    const sql = role
        ? 'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, role = ? WHERE id = ?'
        : 'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ? WHERE id = ?'
    const params = role
        ? [nom, prenom, email, role, targetId]
        : [nom, prenom, email, targetId]
    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' })
        res.json({ message: 'Utilisateur mis à jour' })
    })
})

.get('/user-role', authenticateToken, (req, res) => {
    res.json({ role: req.user.role })
})

.get('/:id', authenticateToken, (req, res) => {
    const targetId = parseInt(req.params.id)
    if (req.user.id !== targetId && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès interdit' })
    }
    const sql = 'SELECT id, nom, prenom, email, date_inscription, role FROM utilisateurs WHERE id = ?'
    db.query(sql, [targetId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' })
        res.json(result)
    })
})

module.exports = router

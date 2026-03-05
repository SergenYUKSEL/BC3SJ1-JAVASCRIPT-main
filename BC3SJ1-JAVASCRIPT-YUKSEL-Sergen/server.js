require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const booksrouter = require('./router/books')
const usersRouter = require('./router/users')
const empruntsRouter = require('./router/emprunts')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const db = require('./services/database')

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

const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'https://exam.andragogy.fr',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}

const router = express.Router()
router.use(helmet({
    contentSecurityPolicy: false
}))
router.use(helmet.frameguard({ action: 'deny' }))
router.use(helmet.noSniff())
router.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }))
router.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }))

router.use(bodyParser.json())
router.use(cors(corsOptions))
router.use(cookieParser())
router.use('/api/books', booksrouter)
router.use('/api/users', usersRouter)
router.use('/api/emprunts', empruntsRouter)

router.post('/api/logout', (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Déconnexion réussie' })
})

router.get('/api/session', authenticateToken, (req, res) => {
    if (req?.user) {
        res.json({ user: req.user })
    } else {
        res.status(401).json({ message: 'Non authentifié' })
    }
})

router.get('/api/statistics', (req, res) => {
    const totalBooksQuery = 'SELECT COUNT(*) AS total_books FROM livres'
    const totalUsersQuery = 'SELECT COUNT(*) AS total_users FROM utilisateurs'

    db.query(totalBooksQuery, (err, booksResult) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' })
        db.query(totalUsersQuery, (err, usersResult) => {
            if (err) return res.status(500).json({ message: 'Erreur serveur' })
            res.json({
                total_books: booksResult[0].total_books,
                total_users: usersResult[0].total_users
            })
        })
    })
})

router.use('/', express.static(path.join(__dirname, './webpub')))
router.use(express.static(path.join(__dirname, './webpub')))
router.use('/*', (_, res) => {
    res.sendFile(path.join(__dirname, './webpub/index.html'))
})
router.get('*', (_, res) => {
    res.sendFile(path.join(__dirname, './webpub/index.html'))
})

module.exports = router

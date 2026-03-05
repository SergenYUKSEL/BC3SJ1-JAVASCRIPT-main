require('dotenv').config()
const mysql = require('mysql2')

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'libr',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'library'
})

db.connect((err) => {
    if (err) {
        throw err
    }
    console.log('Database Connected !')
})

module.exports = db
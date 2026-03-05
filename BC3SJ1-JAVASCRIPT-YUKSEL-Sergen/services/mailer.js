require('dotenv').config()
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
})

async function sendReminderEmail(email, nom, prenom, titre, dateRetourPrevue) {
    const mailOptions = {
        from: `"Bibliothèque" <${process.env.MAIL_USER}>`,
        to: email,
        subject: `Rappel : retour du livre "${titre}"`,
        text: `Bonjour ${prenom} ${nom},\n\nVotre emprunt du livre "${titre}" est en retard (date prévue : ${dateRetourPrevue}).\nMerci de le retourner dès que possible.\n\nCordialement,\nLa Bibliothèque`
    }

    await transporter.sendMail(mailOptions)
}

module.exports = { sendReminderEmail }

const cron = require('node-cron')
const db = require('./database')
const { sendReminderEmail } = require('./mailer')

function startReminderJob() {
    // Toutes les 24h à minuit
    cron.schedule('0 0 * * *', async () => {
        console.log('[ReminderJob] Vérification des emprunts en retard...')

        const today = new Date().toISOString().split('T')[0]
        const sql = `
            SELECT e.id, e.livre_id, e.date_retour_prevue,
                   u.email, u.nom, u.prenom,
                   l.titre
            FROM emprunts e
            JOIN utilisateurs u ON e.utilisateur_id = u.id
            JOIN livres l ON e.livre_id = l.id
            WHERE e.statut = 'en cours' AND e.date_retour_prevue <= ?
        `

        db.query(sql, [today], async (err, results) => {
            if (err) {
                console.error('[ReminderJob] Erreur SQL:', err)
                return
            }

            for (const emprunt of results) {
                try {
                    await sendReminderEmail(
                        emprunt.email,
                        emprunt.nom,
                        emprunt.prenom,
                        emprunt.titre,
                        emprunt.date_retour_prevue
                    )
                    db.query("UPDATE emprunts SET statut = 'en retard' WHERE id = ?", [emprunt.id])
                    console.log(`[ReminderJob] Email envoyé à ${emprunt.email} pour "${emprunt.titre}"`)
                } catch (mailErr) {
                    console.error(`[ReminderJob] Erreur email pour ${emprunt.email}:`, mailErr.message)
                }
            }
        })
    })

    console.log('[ReminderJob] Cron démarré (vérification quotidienne à minuit)')
}

module.exports = { startReminderJob }

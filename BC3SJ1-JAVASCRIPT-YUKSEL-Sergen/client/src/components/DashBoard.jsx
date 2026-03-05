import React, { useEffect, useState } from 'react'
const base = import.meta.env.VITE_BASE_URL || '/'

const Dashboard = () => {
    const [statistics, setStatistics] = useState({ total_books: 0, total_users: 0 })
    const [demandesRetour, setDemandesRetour] = useState([])
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetch(base + 'api/statistics', { credentials: 'include' })
            .then(response => response.status === 200 ? response.json() : (function () { throw "error" }()))
            .then(data => setStatistics(data))
            .catch(error => console.error('Erreur:', error))

        fetchDemandes()
    }, [])

    const fetchDemandes = () => {
        fetch(base + 'api/emprunts', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setDemandesRetour(data.filter(e => e.statut === 'retour demandé'))
                }
            })
            .catch(() => {})
    }

    const handleValider = (id) => {
        fetch(`${base}api/emprunts/${id}/valider-retour`, { method: 'PUT', credentials: 'include' })
            .then(res => res.json())
            .then(data => { setMessage(data.message); fetchDemandes() })
    }

    const handleRefuser = (id) => {
        fetch(`${base}api/emprunts/${id}/refuser-retour`, { method: 'PUT', credentials: 'include' })
            .then(res => res.json())
            .then(data => { setMessage(data.message); fetchDemandes() })
    }

    return (
        <div className="container">
            <h1>Dashboard</h1>
            <div className="statistic">
                <h3>Total des Livres</h3>
                <p>{statistics.total_books}</p>
            </div>
            <div className="statistic">
                <h3>Utilisateurs Enregistrés</h3>
                <p>{statistics.total_users}</p>
            </div>

            <h2>Demandes de retour en attente</h2>
            {message && <p>{message}</p>}
            {demandesRetour.length === 0 ? (
                <p>Aucune demande en attente.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Livre</th>
                            <th>Utilisateur</th>
                            <th>Date d'emprunt</th>
                            <th>Date retour prévue</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demandesRetour.map(e => (
                            <tr key={e.id}>
                                <td>{e.titre}</td>
                                <td>{e.prenom} {e.nom} ({e.email})</td>
                                <td>{new Date(e.date_emprunt).toLocaleDateString('fr-FR')}</td>
                                <td>{new Date(e.date_retour_prevue).toLocaleDateString('fr-FR')}</td>
                                <td>
                                    <button onClick={() => handleValider(e.id)}>✅ Accepter</button>
                                    {' '}
                                    <button onClick={() => handleRefuser(e.id)}>❌ Refuser</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default Dashboard

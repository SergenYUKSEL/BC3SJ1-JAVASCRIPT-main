import React, { useState, useEffect } from 'react'
const base = import.meta.env.VITE_BASE_URL || '/'

const MesEmprunts = () => {
    const [emprunts, setEmprunts] = useState([])
    const [message, setMessage] = useState('')

    const fetchEmprunts = () => {
        fetch(`${base}api/emprunts/mes-emprunts`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setEmprunts(data)
                else setMessage(data.message || 'Erreur serveur')
            })
            .catch(() => setMessage('Erreur lors du chargement des emprunts'))
    }

    useEffect(() => {
        fetchEmprunts()
    }, [])

    const handleRetour = (id) => {
        fetch(`${base}api/emprunts/${id}/retour`, {
            method: 'PUT',
            credentials: 'include'
        })
            .then(res => res.json())
            .then(data => {
                setMessage(data.message)
                fetchEmprunts()
            })
            .catch(() => setMessage('Erreur lors du retour'))
    }

    return (
        <div className="container">
            <h2>Mes emprunts</h2>
            {message && <p>{message}</p>}
            {emprunts.length === 0 ? (
                <p>Aucun emprunt en cours.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Livre</th>
                            <th>Auteur</th>
                            <th>Date d'emprunt</th>
                            <th>Date de retour prévue</th>
                            <th>Statut</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {emprunts.map(emprunt => (
                            <tr key={emprunt.id}>
                                <td>{emprunt.titre}</td>
                                <td>{emprunt.auteur}</td>
                                <td>{new Date(emprunt.date_emprunt).toLocaleDateString('fr-FR')}</td>
                                <td>{new Date(emprunt.date_retour_prevue).toLocaleDateString('fr-FR')}</td>
                                <td>{emprunt.statut}</td>
                                <td>
                                    {(emprunt.statut === 'en cours' || emprunt.statut === 'en retard') && (
                                        <button onClick={() => handleRetour(emprunt.id)}>
                                            Signaler le retour
                                        </button>
                                    )}
                                    {emprunt.statut === 'retour demandé' && (
                                        <span>⏳ En attente de validation</span>
                                    )}
                                    {emprunt.statut === 'retourné' && (
                                        <span>✅ Retourné le {new Date(emprunt.date_retour_effective).toLocaleDateString('fr-FR')}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default MesEmprunts

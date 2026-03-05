import React, { useEffect, useState } from 'react'
const base = import.meta.env.VITE_BASE_URL || '/'

const statutBadge = {
    'en cours':       { color: '#2563eb', label: 'En cours' },
    'en retard':      { color: '#dc2626', label: 'En retard' },
    'retour demandé': { color: '#d97706', label: 'Retour demandé' },
    'retourné':       { color: '#16a34a', label: 'Retourné' },
}

const GestionEmprunts = () => {
    const [emprunts, setEmprunts] = useState([])
    const [filtre, setFiltre] = useState('tous')
    const [message, setMessage] = useState('')

    const fetchEmprunts = () => {
        fetch(base + 'api/emprunts', { credentials: 'include' })
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setEmprunts(data) })
            .catch(() => setMessage('Erreur lors du chargement'))
    }

    useEffect(() => { fetchEmprunts() }, [])

    const handleValider = (id) => {
        fetch(`${base}api/emprunts/${id}/valider-retour`, { method: 'PUT', credentials: 'include' })
            .then(res => res.json())
            .then(data => { setMessage(data.message); fetchEmprunts() })
    }

    const handleRefuser = (id) => {
        fetch(`${base}api/emprunts/${id}/refuser-retour`, { method: 'PUT', credentials: 'include' })
            .then(res => res.json())
            .then(data => { setMessage(data.message); fetchEmprunts() })
    }

    const empruntsFiltres = filtre === 'tous'
        ? emprunts
        : emprunts.filter(e => e.statut === filtre)

    return (
        <div className="container">
            <h2>Gestion des emprunts</h2>

            {message && <p><strong>{message}</strong></p>}

            <div style={{ marginBottom: '1rem' }}>
                {['tous', 'en cours', 'retour demandé', 'en retard', 'retourné'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFiltre(f)}
                        style={{ marginRight: '0.5rem', fontWeight: filtre === f ? 'bold' : 'normal' }}
                    >
                        {f === 'tous' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                        {f !== 'tous' && ` (${emprunts.filter(e => e.statut === f).length})`}
                    </button>
                ))}
            </div>

            {empruntsFiltres.length === 0 ? (
                <p>Aucun emprunt pour ce filtre.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Livre</th>
                            <th>Utilisateur</th>
                            <th>Emprunté le</th>
                            <th>Retour prévu</th>
                            <th>Retour effectif</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empruntsFiltres.map(e => {
                            const badge = statutBadge[e.statut] || {}
                            return (
                                <tr key={e.id}>
                                    <td>{e.titre}</td>
                                    <td>{e.prenom} {e.nom}<br /><small>{e.email}</small></td>
                                    <td>{new Date(e.date_emprunt).toLocaleDateString('fr-FR')}</td>
                                    <td>{new Date(e.date_retour_prevue).toLocaleDateString('fr-FR')}</td>
                                    <td>{e.date_retour_effective ? new Date(e.date_retour_effective).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td>
                                        <span style={{ color: badge.color, fontWeight: 'bold' }}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td>
                                        {e.statut === 'retour demandé' && (
                                            <>
                                                <button onClick={() => handleValider(e.id)}>✅ Accepter</button>
                                                {' '}
                                                <button onClick={() => handleRefuser(e.id)}>❌ Refuser</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default GestionEmprunts

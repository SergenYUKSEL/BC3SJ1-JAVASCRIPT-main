import React, { useState, useEffect } from 'react'
const base = import.meta.env.VITE_BASE_URL || '/'

const Profile = () => {
    const [user, setUser] = useState(null)

    useEffect(() => {
        fetch(base + 'api/session', { credentials: 'include' })
            .then(res => {
                if (res.status === 200) return res.json()
                throw new Error('Non authentifié')
            })
            .then(data => setUser(data.user))
            .catch(() => setUser(null))
    }, [])

    if (!user) return <p>Vous devez être connecté pour accéder à votre profil.</p>

    return (
        <div className="container">
            <h2>Mon profil</h2>
            <p><strong>Email :</strong> {user.email}</p>
            <p><strong>Rôle :</strong> {user.role}</p>
        </div>
    )
}

export default Profile

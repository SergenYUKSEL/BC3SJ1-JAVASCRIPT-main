import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
const base = import.meta.env.VITE_BASE_URL || '/'

const BookDetails = () => {
    const { bookId } = useParams()
    const navigate = useNavigate()
    const [book, setBook] = useState(null)
    const [userRole, setUserRole] = useState('')
    const [empruntMessage, setEmpruntMessage] = useState('')

    useEffect(() => {
        fetch(`${base}api/books/${bookId}`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => setBook(data[0]))
            .catch(error => console.error('Erreur:', error));

        fetch(base+'api/session', {
            credentials: 'include'
        })
            .then(response => {
                if (response.status === 200) return response.json()
                throw new Error('Non authentifié')
            })
            .then(data => setUserRole(data.user.role))
            .catch(() => setUserRole('Guest'));
    }, [bookId]);

    const handleBack = () => {
        navigate('/books');
    };

    const handleEdit = () => {
        navigate(`/edit_book/${bookId}`);
    };

    const handleDelete = () => {
        console.log('Supprimer le livre:', bookId);
    };

    const handleEmprunt = () => {
        fetch(`${base}api/emprunts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ livre_id: book.id })
        })
            .then(res => res.json())
            .then(data => {
                setEmpruntMessage(data.message)
                setBook(prev => ({ ...prev, statut: 'emprunté' }))
            })
            .catch(() => setEmpruntMessage('Erreur lors de l\'emprunt'))
    };

    if (!book) {
        return <p>Livre non trouvé</p>;
    }

    return (
        <div className="container">
            <div className="details">
                <h3>{book.titre}</h3>
                <img className="book-image" src={book.photo_url} alt={book.titre} />
                <p>Auteur : {book.auteur}</p>
                <p>Année de publication : {book.date_publication}</p>
                <p>ISBN : {book.isbn}</p>
                <p>URL de l'image : {book.photo_url}</p>
            </div>
            <div className="back-button">
                <button onClick={handleBack}>Retour à la liste des livres</button>
                {userRole && userRole !== 'Guest' && book.statut === 'disponible' && (
                    <button onClick={handleEmprunt}>Emprunter</button>
                )}
                {empruntMessage && <p>{empruntMessage}</p>}
                {userRole === 'admin' && (
                    <>
                        <button onClick={handleEdit}>Modifier le livre</button>
                        <button onClick={handleDelete}>Supprimer le livre</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default BookDetails
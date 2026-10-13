import { useEffect, useMemo, useState } from 'react';

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'À l’instant';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

function Stars({ value, interactive = false, onChange }) {
  return (
    <div className={`stars ${interactive ? 'stars--interactive' : ''}`} role={interactive ? 'radiogroup' : 'img'} aria-label={`${value} étoile${value > 1 ? 's' : ''} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => interactive ? (
        <button
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
          aria-checked={value === star}
          className={star <= value ? 'star star--filled' : 'star'}
          key={star}
          onClick={() => onChange(star)}
          role="radio"
          type="button"
        >★</button>
      ) : <span aria-hidden="true" className={star <= value ? 'star star--filled' : 'star'} key={star}>★</span>)}
    </div>
  );
}

function ReviewCard({ review }) {
  const initials = review.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <article className="review-card">
      <div className="review-card__top">
        <div className="review-person">
          <span className="avatar" aria-hidden="true">{initials || 'A'}</span>
          <div><strong>{review.name}</strong><span>{formatDate(review.created_at)}</span></div>
        </div>
        <Stars value={Number(review.rating)} />
      </div>
      <p>{review.message}</p>
      <span className="review-card__tag"><span aria-hidden="true">✦</span> Avis de la communauté</span>
    </article>
  );
}

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reviews')
      .then(async (response) => {
        if (!response.ok) throw new Error('Les avis ne sont pas disponibles pour le moment.');
        return response.json();
      })
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setError('Impossible de charger les avis. Réessayez dans un instant.'))
      .finally(() => setLoading(false));
  }, []);

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0, [reviews]);

  async function submitReview(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, rating }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Votre avis n’a pas pu être envoyé.');
      setReviews((current) => [result, ...current]);
      setName('');
      setMessage('');
      setRating(5);
      setNotice('Merci, votre avis a bien été publié !');
    } catch (submissionError) {
      setError(submissionError.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Accueil, La communauté">
          <span className="brand__mark"><span>✳</span></span>
          <span>la communauté<span className="brand__dot">.</span></span>
        </a>
        <a className="header-link" href="#avis">Les avis <span aria-hidden="true">↘</span></a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow"><span className="eyebrow__dot" /> L’ESPACE COMMUNAUTÉ</span>
            <h1>On lit tout.<br /><em>Promis.</em></h1>
            <p>Un endroit simple pour partager ce que vous pensez et découvrir les retours de la communauté.</p>
            <a className="button button--dark" href="#ecrire">Écrire un avis <span aria-hidden="true">↗</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-art__orbit hero-art__orbit--one" />
            <div className="hero-art__orbit hero-art__orbit--two" />
            <div className="hero-art__sun">✳</div>
            <div className="hero-art__note hero-art__note--one"><span>★★★★★</span><small>Ça fait du bien de se retrouver ici.</small></div>
            <div className="hero-art__note hero-art__note--two"><b>↗</b><small>La parole est à vous.</small></div>
            <span className="hero-art__spark hero-art__spark--one">✳</span>
            <span className="hero-art__spark hero-art__spark--two">✦</span>
          </div>
          <div className="hero__bottom"><span>FAIT AVEC VOUS, POUR VOUS</span><span>↓</span></div>
        </section>

        <section className="community" id="avis">
          <div className="community__heading">
            <div><span className="eyebrow">LE MOT EST À VOUS</span><h2>Vos avis,<br /><em>sans filtre.</em></h2></div>
            <p>Chaque retour compte. Laissez le vôtre, ou prenez un moment pour lire ceux des autres.</p>
          </div>

          <div className="community__grid">
            <div className="reviews-column">
              <div className="reviews-summary">
                <div className="summary-score"><strong>{reviews.length ? average.toFixed(1) : '—'}</strong><Stars value={Math.round(average)} /><span>{reviews.length} avis partagé{reviews.length > 1 ? 's' : ''}</span></div>
                <span className="summary-note">Les retours de<br />la communauté <span aria-hidden="true">↘</span></span>
              </div>
              {loading ? <div className="empty-state">Les avis arrivent…</div> : reviews.length ? (
                <div className="review-list">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
              ) : (
                <div className="empty-state"><span className="empty-state__icon">✳</span><strong>Le premier avis est à vous.</strong><span>La conversation commence ici.</span></div>
              )}
              {!loading && reviews.length > 0 && <p className="list-end">Vous êtes à jour <span aria-hidden="true">✦</span></p>}
            </div>

            <aside className="form-card" id="ecrire">
              <div className="form-card__top"><span className="form-number">01 / 01</span><span className="form-flower" aria-hidden="true">✳</span></div>
              <span className="eyebrow">VOTRE ESPACE</span>
              <h3>À vous<br />la parole.</h3>
              <p className="form-intro">Quelques mots peuvent faire toute la différence.</p>
              <form onSubmit={submitReview}>
                <label htmlFor="review-name">Votre prénom</label>
                <input id="review-name" autoComplete="given-name" maxLength="80" onChange={(event) => setName(event.target.value)} placeholder="Comment vous appelle-t-on ?" required value={name} />
                <label>Votre note</label>
                <Stars interactive onChange={setRating} value={rating} />
                <label htmlFor="review-message">Votre avis</label>
                <textarea id="review-message" maxLength="1400" onChange={(event) => setMessage(event.target.value)} placeholder="Racontez-nous…" required rows="4" value={message} />
                <div className="form-footer"><span>{message.length}/1400</span><button className="button button--lime" disabled={submitting} type="submit">{submitting ? 'Envoi…' : 'Publier mon avis'} <span aria-hidden="true">↗</span></button></div>
                {notice && <p aria-live="polite" className="form-message form-message--success">{notice}</p>}
                {error && <p aria-live="polite" className="form-message form-message--error">{error}</p>}
              </form>
              <div className="form-card__foot">MERCI DE FAIRE PARTIE DE L’HISTOIRE <span>♥</span></div>
            </aside>
          </div>
        </section>
      </main>

      <footer className="site-footer"><a className="brand brand--footer" href="#top"><span className="brand__mark"><span>✳</span></span><span>la communauté<span className="brand__dot">.</span></span></a><span>UNE CONVERSATION QUI NOUS RASSEMBLE</span><a href="#top">REMONTER ↑</a></footer>
    </div>
  );
}

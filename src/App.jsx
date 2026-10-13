import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, MessageCircle, Play, Send, Sparkles, Star } from 'lucide-react';

const formatDate = (value) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(value));

function Rating({ value, interactive = false, onChange }) {
  return (
    <div className={`stars ${interactive ? 'stars--interactive' : ''}`} role={interactive ? 'radiogroup' : 'img'} aria-label={`${value} étoile${value > 1 ? 's' : ''} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
          aria-checked={interactive ? value === star : undefined}
          className={`star ${star <= value ? 'star--filled' : ''}`}
          key={star}
          onClick={interactive ? () => onChange(star) : undefined}
          role={interactive ? 'radio' : undefined}
          tabIndex={interactive ? 0 : -1}
          type="button"
        >
          <Star size={interactive ? 25 : 15} fill="currentColor" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, index }) {
  const initials = review.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <article className="review-card" style={{ '--card-index': index }}>
      <div className="review-card__top">
        <div className={`avatar avatar--${index % 5}`}>{initials || 'A'}</div>
        <div className="review-card__person">
          <h3>{review.name}</h3>
          <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
        </div>
        <span className="verified"><Check size={12} strokeWidth={3} /> Avis publié</span>
      </div>
      <Rating value={Number(review.rating)} />
      <p className="review-card__body">“{review.message}”</p>
      <div className="review-card__footer"><MessageCircle size={14} /> Merci pour votre retour</div>
    </article>
  );
}

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  async function loadReviews() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/reviews?sort=${sort}`);
      if (!response.ok) throw new Error('Impossible de charger les avis pour le moment.');
      const data = await response.json();
      setReviews(data.reviews);
    } catch (error) {
      setLoadError(error.message || 'Le serveur est momentanément indisponible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReviews(); }, [sort]);

  const average = useMemo(() => reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)
    : '—', [reviews]);
  const visibleReviews = filter === 'all'
    ? reviews
    : reviews.filter((review) => Number(review.rating) === Number(filter));

  async function submitReview(event) {
    event.preventDefault();
    setFormError('');
    setNotice('');
    setSending(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, rating }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Votre avis n’a pas pu être envoyé.');
      setReviews((current) => [data.review, ...current]);
      setName('');
      setMessage('');
      setRating(5);
      setNotice('Merci ! Votre avis a bien été publié.');
    } catch (error) {
      setFormError(error.message || 'Le serveur est momentanément indisponible.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      <nav className="nav wrap" aria-label="Navigation principale">
        <a className="brand" href="#top" aria-label="Avis & Chaîne, accueil">
          <span className="brand__mark"><Play size={16} fill="currentColor" /></span>
          <span>avis<span className="brand__amp">&</span>chaîne</span>
        </a>
        <a className="nav__link" href="#avis">La communauté <ArrowUpRight size={15} /></a>
      </nav>

      <section className="hero wrap" id="top">
        <div className="hero__copy">
          <span className="eyebrow"><span className="eyebrow__dot" /> Le coin de la communauté</span>
          <h1>Vos mots.<br /><span>Notre moteur.</span></h1>
          <p className="hero__text">Chaque avis nous aide à créer des vidéos qui vous ressemblent. Prenez une minute pour nous raconter ce que vous en pensez.</p>
          <a className="button button--dark" href="#laisser-un-avis">Laisser un avis <ArrowDown size={16} /></a>
          <div className="hero__note"><span className="tiny-avatars"><i>M</i><i>A</i><i>Y</i></span><span>La communauté grandit grâce à vous</span></div>
        </div>
        <div className="hero__art" aria-label="Illustration d'une vidéo et d'une note cinq étoiles">
          <div className="art-grid" />
          <div className="art-sun" />
          <div className="art-window">
            <div className="art-window__bar"><i /><i /><i /><span>nouvelle vidéo</span></div>
            <div className="art-window__scene"><div className="scene-shape scene-shape--one" /><div className="scene-shape scene-shape--two" /><span className="play-button"><Play fill="currentColor" size={20} /></span><span className="scene-caption">on se retrouve ?</span></div>
          </div>
          <div className="rating-sticker"><span className="rating-sticker__stars">★★★★★</span><strong>5.0</strong><small>votre énergie</small></div>
          <div className="art-scribble">✳</div>
          <div className="art-caption">vos retours<br />font la différence <span>↗</span></div>
        </div>
      </section>

      <section className="stats-band">
        <div className="stats wrap">
          <div className="stat"><span className="stat__label">La note moyenne</span><div className="stat__value">{average}<span className="stat__star">★</span></div><span className="stat__foot">sur 5 étoiles</span></div>
          <div className="stat stat--middle"><span className="stat__label">Des avis partagés</span><div className="stat__value">{reviews.length}<span className="stat__plus">+</span></div><span className="stat__foot">et ça continue</span></div>
          <div className="stat stat--message"><Sparkles size={20} /><p>Vos idées font<br /><strong>les prochaines vidéos.</strong></p><a href="#laisser-un-avis">À vous la parole <ArrowUpRight size={14} /></a></div>
        </div>
      </section>

      <section className="reviews-section wrap" id="avis">
        <div className="section-heading">
          <div><span className="eyebrow">LES VOIX DU GROUPE</span><h2>Ils en parlent<span>.</span></h2></div>
          <p>Des retours sincères, des idées et beaucoup de bonnes ondes.</p>
        </div>
        <div className="reviews-toolbar">
          <div className="filter-tabs" aria-label="Filtrer les avis">
            {[['all', 'Tous'], ['5', '5 étoiles'], ['4', '4 étoiles']].map(([value, label]) => <button className={filter === value ? 'filter-tab is-active' : 'filter-tab'} key={value} onClick={() => setFilter(value)} type="button">{label}</button>)}
          </div>
          <label className="sort-select"><span>Trier :</span><select onChange={(event) => setSort(event.target.value)} value={sort}><option value="recent">Plus récents</option><option value="top">Mieux notés</option></select></label>
        </div>
        {loadError && <div className="state-message state-message--error" role="alert">{loadError} <button onClick={loadReviews} type="button">Réessayer</button></div>}
        {loading ? <div className="state-message">On rassemble vos avis…</div> : visibleReviews.length ? (
          <div className="review-grid">{visibleReviews.map((review, index) => <ReviewCard index={index} key={review.id} review={review} />)}</div>
        ) : !loadError ? (
          <div className="empty-state"><span className="empty-state__icon"><MessageCircle size={23} /></span><h3>La première parole est à vous.</h3><p>Partagez votre expérience et lancez la conversation avec la communauté.</p><a href="#laisser-un-avis">Écrire le premier avis <ArrowUpRight size={15} /></a></div>
        ) : null}
      </section>

      <section className="form-section" id="laisser-un-avis">
        <div className="form-layout wrap">
          <div className="form-intro"><span className="eyebrow"><span className="eyebrow__dot" /> On vous écoute</span><h2>À vous<br />la <span>parole.</span></h2><p>Un mot gentil, une idée pour la suite ou un retour honnête : tout compte. Merci de faire partie de l’aventure.</p><div className="form-doodle">✳</div></div>
          <form className="review-form" onSubmit={submitReview}>
            <label className="field"><span>Votre prénom</span><input autoComplete="given-name" maxLength="60" onChange={(event) => setName(event.target.value)} placeholder="Comment on vous appelle ?" required value={name} /></label>
            <fieldset className="field field--rating"><legend>Votre note</legend><Rating interactive onChange={setRating} value={rating} /><span className="rating-hint">{rating === 5 ? 'Génial, merci !' : rating >= 4 ? 'Merci pour votre soutien !' : 'Merci pour votre sincérité.'}</span></fieldset>
            <label className="field"><span>Votre avis</span><textarea maxLength="800" onChange={(event) => setMessage(event.target.value)} placeholder="Qu’est-ce qui vous a plu ? Qu’aimeriez-vous voir ensuite ?" required rows="4" value={message} /><span className="character-count">{message.length}/800</span></label>
            {formError && <p className="form-feedback form-feedback--error" role="alert">{formError}</p>}
            {notice && <p className="form-feedback form-feedback--success" role="status"><Check size={16} />{notice}</p>}
            <button className="button button--yellow" disabled={sending} type="submit">{sending ? 'Envoi en cours…' : 'Publier mon avis'} <Send size={16} /></button>
            <p className="privacy-note">En publiant, votre prénom et votre avis seront visibles par tous.</p>
          </form>
        </div>
      </section>

      <footer className="footer wrap"><a className="brand" href="#top"><span className="brand__mark"><Play size={14} fill="currentColor" /></span><span>avis<span className="brand__amp">&</span>chaîne</span></a><span>Fait avec soin, et grâce à vous. <span className="footer__heart">♥</span></span><a className="footer__top" href="#top">Retour en haut ↑</a></footer>
    </main>
  );
}

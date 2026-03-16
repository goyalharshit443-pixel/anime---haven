/* ============================================================
   ANIME HAVEN — Main JavaScript
   ============================================================ */

// ---------- Particle Canvas Background ----------
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((W * H) / 18000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        dx: (Math.random() - 0.5) * 0.25,
        dy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.5 + 0.1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const color = isDark() ? '255,255,255' : '0,0,0';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${p.o})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  }

  resize();
  createParticles();
  draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
})();

// ---------- Header Scroll Shrink ----------
const header = document.getElementById('site-header');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const s = window.scrollY;
  if (header) {
    header.classList.toggle('scrolled', s > 80);
  }
  lastScroll = s;
}, { passive: true });

// ---------- Mobile Nav ----------
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    spans.forEach(s => s.style.background = mobileNav.classList.contains('open') ? '#e94560' : '');
  });
}

// ---------- Theme Toggle ----------
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Auto detect preference
if (localStorage.getItem('theme')) {
  html.setAttribute('data-theme', localStorage.getItem('theme'));
} else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  html.setAttribute('data-theme', 'light');
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

// ---------- Auth State — Update Header ----------
(function updateAuthUI() {
  const token = localStorage.getItem('authToken');
  const email = localStorage.getItem('userEmail');
  const signinBtn = document.querySelector('.btn-signin');

  if (token && email && signinBtn) {
    // User is signed in — show email + sign out
    signinBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ${email.split('@')[0]}
    `;
    signinBtn.href = '#';
    signinBtn.title = 'Click to sign out';
    signinBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Sign out
      fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      }).catch(() => {});
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      showToast('👋 Signed out!');
      setTimeout(() => location.reload(), 800);
    });
  }
})();

// ---------- Anime Data ----------
const animeData = [
  { id: 'frieren', title: 'Frieren: Beyond Journey\'s End', genre: 'seinen', rating: '9.4', year: '2023', trailer: 'https://www.youtube.com/embed/2SpKBcCkxSE', emoji: '🌿', color: '#4ade80', img: 'images/img1.jpg' },
  { id: 'jjk', title: 'Jujutsu Kaisen', genre: 'shonen', rating: '8.9', year: '2020', trailer: 'https://www.youtube.com/embed/pkKu9hLT-t8', emoji: '⚡', color: '#e94560', img: 'images/img5.jpg' },
  { id: 'dandadan', title: 'Dandadan', genre: 'shonen', rating: '8.7', year: '2024', trailer: 'https://www.youtube.com/embed/jfh4V5PFDA8', emoji: '👻', color: '#a855f7', img: 'images/img2.jpg' },
  { id: 'solo-leveling', title: 'Solo Leveling', genre: 'seinen', rating: '8.8', year: '2024', trailer: 'https://www.youtube.com/embed/Uu4Tv5BqvJ8', emoji: '⚔️', color: '#3b82f6', img: 'images/img6.jpg' },
  { id: 'apothecary', title: 'The Apothecary Diaries', genre: 'josei', rating: '8.5', year: '2023', trailer: 'https://www.youtube.com/embed/DfJE_h4MeFs', emoji: '🌺', color: '#d4a373', img: 'images/img3.jpg' },
  { id: 'fruits-basket', title: 'Fruits Basket', genre: 'shojo', rating: '8.8', year: '2019', trailer: 'https://www.youtube.com/embed/Mv-2GGiCr0c', emoji: '🌸', color: '#ff9aa2', img: 'images/img3.jpg' },
  { id: 'vinland', title: 'Vinland Saga', genre: 'seinen', rating: '8.7', year: '2019', trailer: 'https://www.youtube.com/embed/PAtHVPO8sUE', emoji: '⚓', color: '#64748b', img: 'images/img4.jpg' },
  { id: 'demon-slayer', title: 'Demon Slayer', genre: 'shonen', rating: '8.7', year: '2019', trailer: 'https://www.youtube.com/embed/VQGCKyvzIM4', emoji: '🌊', color: '#06b6d4', img: 'images/img5.jpg' },
  { id: 'nana', title: 'Nana', genre: 'josei', rating: '8.5', year: '2006', trailer: 'https://www.youtube.com/embed/kQCmpuJAiGE', emoji: '🎸', color: '#f97316', img: 'images/img3.jpg' },
  { id: 'pokemon', title: 'Pokémon Horizons', genre: 'kodomomuke', rating: '7.8', year: '2023', trailer: 'https://www.youtube.com/embed/T3DnFIIqEkE', emoji: '⭐', color: '#ffd60a', img: 'images/img6.jpg' },
];

// ---------- Search ----------
const searchInput = document.getElementById('search-input');
const searchDropdown = document.getElementById('search-dropdown');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { searchDropdown.classList.remove('open'); return; }
    const results = animeData.filter(a => a.title.toLowerCase().includes(q));
    if (!results.length) { searchDropdown.classList.remove('open'); return; }
    searchDropdown.innerHTML = results.slice(0, 6).map(a => `
      <div class="search-result-item" onclick="navigateToAnime('${a.id}', '${a.genre}')">
        <span>${a.emoji}</span>
        <span>${a.title}</span>
        <span class="search-result-genre">${a.genre}</span>
      </div>
    `).join('');
    searchDropdown.classList.add('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      searchDropdown.classList.remove('open');
    }
  });
}

function navigateToAnime(id, genre) {
  window.location.href = `${genre}.html#${id}`;
}

// ---------- Render Trending Row ----------
function renderTrending() {
  const row = document.getElementById('trending-row');
  if (!row) return;
  row.innerHTML = animeData.map(anime => `
    <div class="anime-card reveal">
      <div class="anime-card-poster">
        ${anime.img
          ? `<img src="${anime.img}" alt="${anime.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          : `<div class="poster-placeholder" style="background: linear-gradient(135deg, ${anime.color}22, ${anime.color}08)"><span style="font-size:3.5rem">${anime.emoji}</span></div>`
        }
        <div class="anime-card-overlay">
          <button class="card-watch-btn" onclick="openTrailer('${anime.trailer}')">▶ Watch Trailer</button>
        </div>
      </div>
      <div class="anime-card-info">
        <div class="anime-card-title">${anime.title}</div>
        <div class="anime-card-meta">
          <span class="anime-genre-tag ${anime.genre}">${anime.genre}</span>
          <span class="anime-card-rating">⭐ ${anime.rating}</span>
        </div>
      </div>
    </div>
  `).join('');
  setTimeout(initReveal, 100);
}

renderTrending();

// ---------- Trailer Modal ----------
window.openTrailer = function(url) {
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  if (!modal || !iframe) return;
  iframe.src = url + '?autoplay=1';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeTrailer = function() {
  const modal = document.getElementById('trailer-modal');
  const iframe = document.getElementById('trailer-iframe');
  if (!modal || !iframe) return;
  modal.classList.remove('open');
  iframe.src = '';
  document.body.style.overflow = '';
};

document.getElementById('trailer-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTrailer();
});

// ---------- Favourites (Backend + localStorage fallback) ----------
window.addToFavourites = async function(id, title) {
  const token = localStorage.getItem('authToken');

  if (token) {
    // User is signed in — save to backend
    try {
      const res = await fetch('/api/favourites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ animeId: id, title })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.message}`);
      } else if (res.status === 401) {
        // Token expired — fall back to localStorage
        localStorage.removeItem('authToken');
        showToast('Session expired. Saving locally.');
        saveFavLocal(id, title);
      } else {
        showToast(data.message || 'Already in favourites!');
      }
    } catch {
      // Server unreachable — fall back
      saveFavLocal(id, title);
    }
  } else {
    // Not signed in — save to localStorage
    saveFavLocal(id, title);
  }
};

function saveFavLocal(id, title) {
  let favs = JSON.parse(localStorage.getItem('favourites') || '[]');
  if (!favs.includes(id)) {
    favs.push(id);
    localStorage.setItem('favourites', JSON.stringify(favs));
    showToast(`✅ ${title} added to favourites!`);
  } else {
    showToast('Already in favourites!');
  }
}

// ---------- Toast ----------
window.showToast = function(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ---------- Intersection Observer Reveal ----------
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

initReveal();

// Observe genre cards
document.querySelectorAll('.genre-card, .anime-card, .spotlight-inner').forEach((el, i) => {
  el.classList.add('reveal');
});
initReveal();

// ---------- Hero Slideshow ----------
(function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dots .dot');
  if (!slides.length) return;
  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  document.getElementById('hero-next')?.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  document.getElementById('hero-prev')?.addEventListener('click', () => { goTo(current - 1); startAuto(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.slide));
      startAuto();
    });
  });

  startAuto();
})();

// ---------- Lightbox ----------
window.openLightbox = function(src, caption) {
  const overlay = document.getElementById('lightbox-overlay');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!overlay || !img) return;
  img.src = src;
  img.alt = caption;
  if (cap) cap.textContent = caption;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
  const overlay = document.getElementById('lightbox-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    const img = document.getElementById('lightbox-img');
    if (img) img.src = '';
  }, 300);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeTrailer(); closeLightbox(); }
});

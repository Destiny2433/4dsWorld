// 4D'S World - Shared Layout: Preloader + Consistent Footer Injector

// ── PRELOADER ──────────────────────────────────────────────
(function injectPreloader() {
    const el = document.createElement('div');
    el.id = 'page-preloader';
    el.innerHTML = '<div class="preloader-logo"><img src="/logoo.png" alt="4D\'S World" class="logo-img"></div>';
    document.body.insertBefore(el, document.body.firstChild);

    window.addEventListener('load', () => {
        setTimeout(() => el.classList.add('hidden'), 200);
    });
    // Fallback: hide after 3 seconds no matter what
    setTimeout(() => el.classList.add('hidden'), 3000);
})();

// ── FOOTER ────────────────────────────────────────────────
function injectFooter() {
    // Don't inject on admin page
    if (window.location.pathname.includes('admin')) return;

    const existing = document.querySelector('footer');
    if (existing) existing.remove();

    const footer = document.createElement('footer');
    footer.innerHTML = `
        <div class="container footer-grid">
            <div class="footer-brand">
                <a href="/" class="logo"><img src="/logoo.png" alt="4D'S World" class="logo-img"></a>
                <p style="color:var(--text-secondary);margin:12px 0 20px;line-height:1.7;font-size:0.9rem;">
                    Nigeria's premium fashion boutique.<br>
                    Clothes, Shoes, Bags &amp; Accessories.
                </p>
                <div class="social-links">
                    <a href="https://www.facebook.com/search/top?q=tessy%20collections" target="_blank" rel="noopener" class="social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://wa.me/2348160458303" target="_blank" rel="noopener" class="social-btn" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    <a href="mailto:destinydomi@gmail.com" class="social-btn" title="Email"><i class="fas fa-envelope"></i></a>
                </div>
            </div>
            <div>
                <h3 class="footer-title">Boutique</h3>
                <ul class="footer-links">
                    <li><a href="/shop?category=clothes">Clothes Collection</a></li>
                    <li><a href="/shop?category=shoes">Shoes &amp; Heels</a></li>
                    <li><a href="/shop?category=bags">Luxury Handbags</a></li>
                    <li><a href="/shop?category=accessories">Jewelry &amp; Watches</a></li>
                </ul>
            </div>
            <div>
                <h3 class="footer-title">About</h3>
                <ul class="footer-links">
                    <li><a href="/about">Our Story</a></li>
                    <li><a href="/shop">Shop Now</a></li>
                    <li><a href="/contact">Store Location</a></li>
                    <li><a href="/contact">Support Line</a></li>
                </ul>
            </div>
            <div>
                <h3 class="footer-title">Contact</h3>
                <ul class="footer-contact">
                    <li><i class="fas fa-map-marker-alt"></i> <span>411 Road, Gowon Estate, Egbeda, Lagos</span></li>
                    <li><i class="fas fa-phone"></i> <span><a href="tel:+2348160458303" style="color:inherit;text-decoration:none;">08160458303</a></span></li>
                    <li><i class="fab fa-whatsapp"></i> <span><a href="https://wa.me/2348160458303" target="_blank" style="color:var(--success);text-decoration:none;">WhatsApp Us</a></span></li>
                    <li><i class="fas fa-envelope"></i> <span><a href="mailto:destinydomi@gmail.com" style="color:inherit;text-decoration:none;">destinydomi@gmail.com</a></span></li>
                </ul>
            </div>
        </div>
        <div class="container footer-bottom">
            <p>&copy; 2026 4D'S World. All Rights Reserved. | Made with <span style="color:#e74c3c;">&#10084;</span> by <a href="https://bit.ly/HiveryTech" target="_blank" rel="noopener" style="color:var(--accent-gold);text-decoration:none;font-weight:600;">HiveryTech LTD</a></p>
            <div class="payment-providers">
                <span style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-right:8px;">Secured by</span>
                <i class="fab fa-cc-visa" title="Visa" style="color:#1a1f71;font-size:1.4rem;margin-right:4px;"></i>
                <i class="fab fa-cc-mastercard" title="Mastercard" style="color:#eb001b;font-size:1.4rem;margin-right:6px;"></i>
                <span style="font-size:0.85rem;font-weight:700;color:#fff;background:#3ec1b7;padding:3px 8px;border-radius:4px;font-family:sans-serif;">paystack</span>
            </div>
        </div>`;
    document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', injectFooter);

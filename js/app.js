// 4D'S World - Core Shared Application Logic

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    updateCartBadge();
    initWhatsAppFloat();
});

// --- NAVIGATION & CLEAN LINKS ---
function initNavigation() {
    const header = document.querySelector('header');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    // Header scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });

    if (window.scrollY > 50) header.classList.add('scrolled');

    // Mobile Hamburger Menu
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            icon.className = navMenu.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
        });
    }

    // Clean up internal links (remove .html if present)
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.endsWith('.html')) {
            link.setAttribute('href', href.replace('.html', ''));
        }
    });
}

// --- SHOPPING CART MANAGER (Retail Only) ---
const CartManager = {
    getCart() {
        return JSON.parse(localStorage.getItem('4ds_cart')) || [];
    },

    saveCart(cart) {
        localStorage.setItem('4ds_cart', JSON.stringify(cart));
        updateCartBadge();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    },

    addItem(productId, quantity = 1, size = '', color = '') {
        const cart = this.getCart();
        const product = products.find(p => p.id === productId);
        
        if (!product) return false;

        const existingItemIndex = cart.findIndex(item =>
            item.id === productId && item.size === size && item.color === color
        );

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                size: size || (product.sizes ? product.sizes[0] : ''),
                color: color || (product.colors ? product.colors[0] : ''),
                quantity: quantity
            });
        }

        this.saveCart(cart);
        showToast(`${product.name} added to cart`, 'success');
        return true;
    },

    removeItem(productId, size = '', color = '') {
        let cart = this.getCart();
        cart = cart.filter(item => 
            !(item.id === productId && item.size === size && item.color === color)
        );
        this.saveCart(cart);
        showToast('Item removed from cart', 'info');
    },

    updateQuantity(productId, quantity, size = '', color = '') {
        const cart = this.getCart();
        const item = cart.find(item => 
            item.id === productId && item.size === size && item.color === color
        );

        if (item) {
            item.quantity = Math.max(1, parseInt(quantity));
            this.saveCart(cart);
        }
    },

    clearCart() {
        localStorage.removeItem('4ds_cart');
        updateCartBadge();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
    },

    getCartCount() {
        return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
    },

    getCartTotal() {
        return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
};

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const count = CartManager.getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast glass-panel ${type}`;
    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'info') iconClass = 'fa-info-circle';

    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function initWhatsAppFloat() {
    const btn = document.createElement('a');
    btn.href = 'https://wa.me/2348160458303';
    btn.target = '_blank';
    btn.className = 'whatsapp-float';
    btn.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(btn);
}

function formatNaira(amount) {
    return '₦' + parseFloat(amount).toLocaleString('en-NG');
}

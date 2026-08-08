// 4D'S World - Core Shared Application Logic

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPricingMode();
    updateCartBadge();
    initWhatsAppFloat();
});

// --- NAVIGATION & HEADER EFFECT ---
function initNavigation() {
    const header = document.querySelector('header');
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    // Header scroll background change
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Initial check in case of page refresh mid-scroll
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    }

    // Mobile Hamburger Menu Toggle
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
    }
}

// --- RETAIL vs WHOLESALE PRICING ---
function initPricingMode() {
    const modeBtn = document.getElementById('pricing-mode-toggle');
    if (!modeBtn) return;

    // Get current mode or default to retail
    let currentMode = localStorage.getItem('4ds_pricing_mode') || 'retail';
    updatePricingToggleUI(currentMode);

    modeBtn.addEventListener('click', () => {
        currentMode = currentMode === 'retail' ? 'wholesale' : 'retail';
        localStorage.setItem('4ds_pricing_mode', currentMode);
        updatePricingToggleUI(currentMode);
        
        // Notify any active page lists to re-render
        window.dispatchEvent(new CustomEvent('pricingModeChanged', { detail: currentMode }));
        showToast(`Switched to ${currentMode.toUpperCase()} pricing`, 'success');
    });
}

function updatePricingToggleUI(mode) {
    const modeBtn = document.getElementById('pricing-mode-toggle');
    if (!modeBtn) return;
    
    const label = modeBtn.querySelector('span');
    const icon = modeBtn.querySelector('i');
    
    if (mode === 'wholesale') {
        label.textContent = 'Wholesale';
        icon.className = 'fas fa-boxes';
        modeBtn.style.borderColor = 'var(--accent-gold)';
        modeBtn.style.color = 'var(--accent-gold)';
    } else {
        label.textContent = 'Retail';
        icon.className = 'fas fa-shopping-bag';
        modeBtn.style.borderColor = 'var(--border-color)';
        modeBtn.style.color = '#fff';
    }
}

function getPricingMode() {
    return localStorage.getItem('4ds_pricing_mode') || 'retail';
}

// --- SHOPPING CART MANAGER (localStorage) ---
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

        // Check if item with exact specs already exists
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
                wholesalePrice: product.wholesalePrice,
                wholesaleMinQty: product.wholesaleMinQty,
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
        const mode = getPricingMode();
        return this.getCart().reduce((sum, item) => {
            // Apply wholesale pricing if quantity meets min requirement or if global mode is wholesale
            const useWholesale = (mode === 'wholesale') || (item.quantity >= item.wholesaleMinQty);
            const activePrice = useWholesale ? item.wholesalePrice : item.price;
            return sum + (activePrice * item.quantity);
        }, 0);
    }
};

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    
    const count = CartManager.getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

// --- TOAST NOTIFICATIONS ---
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
    
    toast.innerHTML = `
        <i class="fas ${iconClass}" style="color: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--accent-gold)'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animations
    setTimeout(() => toast.classList.add('show'), 50);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- WHATSAPP FLOATING BUTTON ---
function initWhatsAppFloat() {
    const btn = document.createElement('a');
    btn.href = 'https://wa.me/2348160458303?text=Hello%204D%27S%20World,%20I%20want%20to%20make%20an%20inquiry.';
    btn.target = '_blank';
    btn.className = 'whatsapp-float';
    btn.innerHTML = '<i class="fab fa-whatsapp"></i>';
    btn.title = 'Chat with us on WhatsApp';
    document.body.appendChild(btn);
}

// --- UTILITY FORMATTING ---
function formatNaira(amount) {
    return '₦' + parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

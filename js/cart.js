// 4D'S World - Shopping Cart Page Logic

document.addEventListener('DOMContentLoaded', () => {
    initCartPage();
});

function initCartPage() {
    const cartItemsWrap = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const deliveryEl = document.getElementById('cart-delivery');
    const totalEl = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('btn-clear-cart');
    const checkoutBtn = document.getElementById('btn-proceed-checkout');
    
    const DELIVERY_FEE = 2500;
    const FREE_DELIVERY_THRESHOLD = 150000;

    renderCart();

    window.addEventListener('cartUpdated', renderCart);

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your shopping cart?')) {
                CartManager.clearCart();
                renderCart();
            }
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (CartManager.getCartCount() === 0) {
                showToast('Your cart is empty!', 'error');
                return;
            }
            window.location.href = '/checkout';
        });
    }

    function renderCart() {
        const cart = CartManager.getCart();

        if (!cartItemsWrap) return;

        if (cart.length === 0) {
            cartItemsWrap.innerHTML = `
                <div class="empty-cart-view" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-shopping-basket" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i>
                    <h2>Your Shopping Cart is Empty</h2>
                    <p style="color: var(--text-secondary); margin: 15px 0 30px 0;">Look through our boutique shop to find your favourite items.</p>
                    <a href="/shop" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            if (clearCartBtn) clearCartBtn.style.display = 'none';
            if (checkoutBtn) checkoutBtn.style.display = 'none';
            if (subtotalEl) subtotalEl.textContent = formatNaira(0);
            if (deliveryEl) deliveryEl.textContent = formatNaira(0);
            if (totalEl) totalEl.textContent = formatNaira(0);
            return;
        }

        if (clearCartBtn) clearCartBtn.style.display = 'inline-flex';
        if (checkoutBtn) checkoutBtn.style.display = 'inline-flex';

        cartItemsWrap.innerHTML = cart.map(item => {
            const itemSubtotal = item.price * item.quantity;
            return `
                <div class="cart-item glass-panel" style="display: flex; gap: 20px; padding: 20px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
                    <img src="${item.image}" alt="${item.name}" style="width: 90px; height: 120px; object-fit: cover; border-radius: 6px;">
                    <div class="cart-item-details" style="flex-grow: 1; min-width: 200px;">
                        <h3 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 6px;">${item.name}</h3>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                            Size: <span style="color: #fff; margin-right: 15px;">${item.size || 'N/A'}</span>
                            Color: <span style="color: #fff;">${item.color || 'N/A'}</span>
                        </p>
                        <div style="font-size: 0.85rem;">
                            <span style="color: var(--accent-gold);">${formatNaira(item.price)}</span>
                        </div>
                    </div>
                    <div class="quantity-controller" style="display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.2);">
                        <button onclick="updateCartItemQty('${item.id}', ${item.quantity - 1}, '${item.size}', '${item.color}')" style="padding: 10px 15px; cursor: pointer;"><i class="fas fa-minus"></i></button>
                        <input type="text" value="${item.quantity}" readonly style="width: 40px; text-align: center; font-weight: 600; font-size: 0.95rem;">
                        <button onclick="updateCartItemQty('${item.id}', ${item.quantity + 1}, '${item.size}', '${item.color}')" style="padding: 10px 15px; cursor: pointer;"><i class="fas fa-plus"></i></button>
                    </div>
                    <div style="text-align: right; min-width: 100px;">
                        <span style="display: block; font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: #fff;">${formatNaira(itemSubtotal)}</span>
                        <button onclick="removeCartItem('${item.id}', '${item.size}', '${item.color}')" style="color: var(--error); font-size: 0.85rem; margin-top: 8px; cursor: pointer; background:none;">
                            <i class="fas fa-trash-alt" style="margin-right: 4px;"></i> Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');


        const cartSubtotal = CartManager.getCartTotal();
        const activeDelivery = cartSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const cartTotal = cartSubtotal + activeDelivery;

        if (subtotalEl) subtotalEl.textContent = formatNaira(cartSubtotal);
        
        if (deliveryEl) {
            if (activeDelivery === 0) {
                deliveryEl.innerHTML = '<span style="color: var(--success); font-weight: 600;">FREE</span>';
            } else {
                deliveryEl.textContent = formatNaira(activeDelivery);
            }
        }
        
        if (totalEl) totalEl.textContent = formatNaira(cartTotal);
    }
}

window.updateCartItemQty = function(id, qty, size, color) {
    if (qty < 1) {
        removeCartItem(id, size, color);
    } else {
        CartManager.updateQuantity(id, qty, size, color);
    }
};

window.removeCartItem = function(id, size, color) {
    CartManager.removeItem(id, size, color);
};

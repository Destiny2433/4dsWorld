// 4D'S World - Secure Checkout Page Logic (Flask Backend Integration)

document.addEventListener('DOMContentLoaded', () => {
    initCheckoutPage();
});

function initCheckoutPage() {
    const summaryItemsWrap = document.getElementById('checkout-summary-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const deliveryEl = document.getElementById('checkout-delivery');
    const totalEl = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');
    
    const DELIVERY_FEE = 2500;
    const FREE_DELIVERY_THRESHOLD = 150000;

    const cart = CartManager.getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty! Redirecting to shop...', 'error');
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 1500);
        return;
    }

    renderSummary();

    // Form submission
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('checkout-email').value.trim();
            const fullName = document.getElementById('checkout-name').value.trim();
            const phone = document.getElementById('checkout-phone').value.trim();
            const address = document.getElementById('checkout-address').value.trim();
            const city = document.getElementById('checkout-city').value.trim();
            const state = document.getElementById('checkout-state').value.trim();

            if (!email || !fullName || !phone || !address || !city || !state) {
                showToast('Please fill all delivery fields!', 'error');
                return;
            }

            const pricingMode = getPricingMode();

            // Prepare order payload
            const payload = {
                email,
                name: fullName,
                phone,
                address,
                city,
                state,
                items: cart,
                pricingMode
            };

            showToast('Initializing payment checkout...', 'info');

            try {
                // Call backend API to create order & get Paystack access code
                const res = await fetch('/api/orders/create', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!data.success) {
                    showToast(data.error || 'Failed to initialize order', 'error');
                    return;
                }

                // Resume transaction with Paystack Pop Popup using secure access code
                payWithPaystackPopup(data.access_code, data.reference, email, fullName, address, city, state);

            } catch (err) {
                console.error(err);
                showToast('Network error during checkout initialization', 'error');
            }
        });
    }

    function renderSummary() {
        if (!summaryItemsWrap) return;

        const mode = getPricingMode();
        summaryItemsWrap.innerHTML = cart.map(item => {
            const isWholesaleItem = (mode === 'wholesale') || (item.quantity >= item.wholesaleMinQty);
            const activePrice = isWholesaleItem ? item.wholesalePrice : item.price;
            
            return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.92rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">
                    <div>
                        <span style="font-weight: 500; color: #fff;">${item.name}</span>
                        <span style="color: var(--text-secondary); font-size: 0.8rem; display: block;">
                            Qty: ${item.quantity} | Size: ${item.size || 'N/A'} | Color: ${item.color || 'N/A'}
                        </span>
                    </div>
                    <span style="color: var(--accent-gold); font-weight: 600;">
                        ${formatNaira(activePrice * item.quantity)}
                    </span>
                </div>
            `;
        }).join('');

        const cartSubtotal = CartManager.getCartTotal();
        const activeDelivery = cartSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const cartTotal = cartSubtotal + activeDelivery;

        if (subtotalEl) subtotalEl.textContent = formatNaira(cartSubtotal);
        
        if (deliveryEl) {
            if (activeDelivery === 0) {
                deliveryEl.innerHTML = `<span style="color: var(--success); font-weight: 600;">FREE</span>`;
            } else {
                deliveryEl.textContent = formatNaira(activeDelivery);
            }
        }
        
        if (totalEl) totalEl.textContent = formatNaira(cartTotal);
    }
}

// --- SECURE PAYSTACK RESUME TRANSACTION POPUP ---
function payWithPaystackPopup(accessCode, reference, email, name, address, city, state) {
    if (typeof PaystackPop === 'undefined') {
        showToast('Paystack SDK is not loaded. Check connection!', 'error');
        return;
    }

    try {
        const handler = new PaystackPop();
        handler.resumeTransaction(accessCode, {
            onSuccess: async function(response) {
                // Securely verify transaction status server-side before declaring success
                showToast('Verifying payment details...', 'info');
                try {
                    const res = await fetch('/api/orders/verify', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ reference })
                    });
                    const data = await res.json();

                    if (data.success && data.status === 'Paid') {
                        showSuccessScreen(reference, response.reference, data.amount, name, address, city, state);
                        CartManager.clearCart();
                    } else {
                        showToast('Payment verification pending or failed', 'warning');
                    }
                } catch (err) {
                    showToast('Failed to verify payment with server', 'error');
                }
            },
            onCancel: function() {
                showToast('Transaction cancelled by customer.', 'info');
            }
        });
    } catch (err) {
        console.error(err);
        showToast('Failed to open payment gateway', 'error');
    }
}

// --- ORDER CONFIRMATION / SUCCESS VIEW ---
function showSuccessScreen(orderRef, paystackRef, totalAmount, name, address, city, state) {
    const checkoutContainer = document.querySelector('.checkout-grid');
    if (!checkoutContainer) return;

    checkoutContainer.parentElement.innerHTML = `
        <div class="glass-panel text-center" style="max-width: 600px; margin: 40px auto; padding: 40px; text-align: center; border-color: var(--success); box-shadow: 0 0 30px rgba(46, 196, 182, 0.15);">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(46, 196, 182, 0.1); border: 2px solid var(--success); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; font-size: 2.2rem; color: var(--success);">
                <i class="fas fa-check"></i>
            </div>
            
            <h1 style="font-family: var(--font-heading); font-size: 2.2rem; margin-bottom: 12px;">Payment Successful!</h1>
            <p style="color: var(--text-secondary); margin-bottom: 30px;">Thank you for shopping at 4D'S World. Your order has been placed successfully.</p>
            
            <div class="receipt-card" style="background: rgba(0,0,0,0.2); border: 1px dashed var(--border-color); border-radius: 8px; padding: 24px; text-align: left; margin-bottom: 30px; font-size: 0.95rem;">
                <h3 style="font-family: var(--font-heading); text-transform: uppercase; color: var(--accent-gold); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 15px;">Order Receipt</h3>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: var(--text-secondary);">Order Reference:</span>
                    <strong style="color: #fff;">${orderRef}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: var(--text-secondary);">Paystack Ref:</span>
                    <span style="color: #fff; font-family: monospace;">${paystackRef}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: var(--text-secondary);">Customer Name:</span>
                    <strong style="color: #fff;">${name}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: var(--text-secondary);">Total Paid:</span>
                    <strong style="color: var(--success); font-size: 1.1rem;">${formatNaira(totalAmount)}</strong>
                </div>
                <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                    <span style="color: var(--text-secondary); display: block; margin-bottom: 4px;">Delivery Address:</span>
                    <address style="color: #fff; font-style: normal; line-height: 1.4;">${address}, ${city}, ${state}</address>
                </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 15px;">
                <a href="shop.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Back to Shop</a>
                <a href="https://wa.me/2348160458303?text=Hello%204D%27S%20World,%20I%20just%20paid%20for%20order%20${orderRef}" target="_blank" class="btn btn-primary" style="background:#25d366; color:white; border:none;"><i class="fab fa-whatsapp"></i> Confirm on WhatsApp</a>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

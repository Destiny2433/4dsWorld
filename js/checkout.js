// 4D'S World - Secure Checkout Page Logic
// Live Paystack Public Key
const PAYSTACK_PUBLIC_KEY = 'pk_live_488f26bb8577fa01cb806e72930cff25c98e1950';

document.addEventListener('DOMContentLoaded', function() {
    initCheckoutPage();
    
    // Check if returning from Paystack redirect
    checkPaystackReturn();
});

function checkPaystackReturn() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('reference') || params.get('trxref');
    if (ref) {
        verifyPayment(ref);
    }
}

async function verifyPayment(reference) {
    try {
        var res = await fetch('/api/orders/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ reference: reference })
        });
        var data = await res.json();
        
        CartManager.clearCart();
        
        if (data.success && data.status === 'Paid') {
            showToast('Payment successful! Thank you.', 'success');
            setTimeout(function() { window.location.href = '/shop'; }, 2000);
        } else {
            showToast('Payment received! We will confirm shortly.', 'success');
            setTimeout(function() { window.location.href = '/shop'; }, 2000);
        }
    } catch (err) {
        CartManager.clearCart();
        showToast('Thank you for your payment!', 'success');
        setTimeout(function() { window.location.href = '/shop'; }, 2000);
    }
}

function initCheckoutPage() {
    var summaryItemsWrap = document.getElementById('checkout-summary-items');
    var subtotalEl = document.getElementById('checkout-subtotal');
    var deliveryEl = document.getElementById('checkout-delivery');
    var totalEl = document.getElementById('checkout-total');
    var checkoutForm = document.getElementById('checkout-form');
    
    var DELIVERY_FEE = 2500;
    var FREE_DELIVERY_THRESHOLD = 150000;

    var cart = CartManager.getCart();
    if (cart.length === 0) {
        showToast('Your cart is empty! Redirecting to shop...', 'error');
        setTimeout(function() { window.location.href = '/shop'; }, 1500);
        return;
    }

    renderSummary();

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            var email = document.getElementById('checkout-email').value.trim();
            var fullName = document.getElementById('checkout-name').value.trim();
            var phone = document.getElementById('checkout-phone').value.trim();
            var address = document.getElementById('checkout-address').value.trim();
            var city = document.getElementById('checkout-city').value.trim();
            var state = document.getElementById('checkout-state').value.trim();

            if (!email || !fullName || !phone || !address || !city || !state) {
                showToast('Please fill all delivery fields!', 'error');
                return;
            }

            var payload = {
                email: email,
                name: fullName,
                phone: phone,
                address: address,
                city: city,
                state: state,
                items: cart,
                pricingMode: 'retail'
            };

            try {
                var res = await fetch('/api/orders/create', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                var data = await res.json();

                if (!data.success) {
                    showToast(data.error || 'Failed to initialize order', 'error');
                    return;
                }

                // Simple Paystack popup - opens immediately, no alert
                var totalKobo = data.amount_in_kobo;
                openPaystackPopup(email, totalKobo, data.reference, fullName);

            } catch (err) {
                console.error(err);
                showToast('Network error during checkout', 'error');
            }
        });
    }

    function renderSummary() {
        if (!summaryItemsWrap) return;

        var html = '';
        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:0.92rem;border-bottom:1px solid rgba(255,255,255,0.03);padding-bottom:8px;">' +
                '<div>' +
                    '<span style="font-weight:500;color:#fff;">' + item.name + '</span>' +
                    '<span style="color:var(--text-secondary);font-size:0.8rem;display:block;">Qty: ' + item.quantity + ' | Size: ' + (item.size || 'N/A') + ' | Color: ' + (item.color || 'N/A') + '</span>' +
                '</div>' +
                '<span style="color:var(--accent-gold);font-weight:600;">' + formatNaira(item.price * item.quantity) + '</span>' +
            '</div>';
        }
        summaryItemsWrap.innerHTML = html;

        var cartSubtotal = CartManager.getCartTotal();
        var activeDelivery = cartSubtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        var cartTotal = cartSubtotal + activeDelivery;

        if (subtotalEl) subtotalEl.textContent = formatNaira(cartSubtotal);
        if (deliveryEl) {
            deliveryEl.innerHTML = activeDelivery === 0 ? '<span style="color:var(--success);font-weight:600;">FREE</span>' : formatNaira(activeDelivery);
        }
        if (totalEl) totalEl.textContent = formatNaira(cartTotal);
    }
}

function openPaystackPopup(email, amountInKobo, reference, fullName) {
    if (typeof PaystackPop === 'undefined') {
        showToast('Loading payment gateway...', 'info');
        setTimeout(function() {
            openPaystackPopup(email, amountInKobo, reference, fullName);
        }, 1500);
        return;
    }

    var handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: reference,
        metadata: {
            custom_fields: [
                {
                    display_name: "Full Name",
                    variable_name: "full_name",
                    value: fullName
                }
            ]
        },
        callback: function(response) {
            // Payment successful - verify with backend
            verifyPayment(reference);
        },
        onClose: function() {
            // Do nothing - just close the popup silently
        }
    });
    handler.openIframe();
}

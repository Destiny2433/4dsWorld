// 4D'S World - Single Product Detail Page Logic

document.addEventListener('DOMContentLoaded', () => {
    if (products && products.length > 0) {
        initProductDetail();
    } else {
        window.addEventListener('productsLoaded', initProductDetail);
    }
});

function initProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
        window.location.href = 'shop.html';
        return;
    }

    // Dynamic Element Target References
    const pImage = document.getElementById('product-detail-image');
    const pBadge = document.getElementById('product-detail-badge');
    const pCategory = document.getElementById('product-detail-category');
    const pTitle = document.getElementById('product-detail-title');
    const pRating = document.getElementById('product-detail-rating');
    const pPrice = document.getElementById('product-detail-price');
    const pPriceNote = document.getElementById('product-detail-pricenote');
    const pDescription = document.getElementById('product-detail-description');
    
    const sizesContainer = document.getElementById('sizes-selector-wrap');
    const colorsContainer = document.getElementById('colors-selector-wrap');
    const quantityInput = document.getElementById('detail-qty');
    const qtyMinus = document.getElementById('detail-qty-minus');
    const qtyPlus = document.getElementById('detail-qty-plus');
    
    const wholesaleTierTableBody = document.querySelector('#wholesale-tier-table tbody');
    const totalCalcPrice = document.getElementById('total-calculated-price');
    
    const addToCartBtn = document.getElementById('btn-add-to-cart');
    const buyNowBtn = document.getElementById('btn-buy-now');

    // Breadcrumbs update
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    // Set simple details
    if (pImage) pImage.src = product.image;
    if (pCategory) pCategory.textContent = product.category;
    if (pTitle) pTitle.textContent = product.name;
    if (pDescription) pDescription.textContent = product.description;
    
    if (pBadge) {
        if (product.badge) {
            pBadge.textContent = product.badge;
            pBadge.style.display = 'inline-block';
        } else {
            pBadge.style.display = 'none';
        }
    }

    // Render ratings stars
    if (pRating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(product.rating)) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        pRating.innerHTML = `${stars} <span>(${product.rating} / 5 Rating)</span>`;
    }

    // Selected options variables
    let selectedSize = product.sizes ? product.sizes[0] : '';
    let selectedColor = product.colors ? product.colors[0] : '';

    // Render size buttons
    if (sizesContainer && product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map((size, idx) => `
            <button class="option-pill ${idx === 0 ? 'active' : ''}" data-size="${size}">${size}</button>
        `).join('');
        
        sizesContainer.querySelectorAll('.option-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                sizesContainer.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSize = btn.dataset.size;
            });
        });
    } else if (sizesContainer) {
        sizesContainer.closest('.option-group').style.display = 'none';
    }

    // Render color buttons
    if (colorsContainer && product.colors && product.colors.length > 0) {
        colorsContainer.innerHTML = product.colors.map((color, idx) => `
            <button class="option-pill ${idx === 0 ? 'active' : ''}" data-color="${color}">${color}</button>
        `).join('');

        colorsContainer.querySelectorAll('.option-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                colorsContainer.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedColor = btn.dataset.color;
            });
        });
    } else if (colorsContainer) {
        colorsContainer.closest('.option-group').style.display = 'none';
    }

    // Wholesale discount tier grid details
    if (wholesaleTierTableBody) {
        wholesaleTierTableBody.innerHTML = `
            <tr>
                <td>Retail (1 - ${product.wholesaleMinQty - 1} pcs)</td>
                <td>${formatNaira(product.price)}</td>
            </tr>
            <tr class="highlight-tier">
                <td>Wholesale (${product.wholesaleMinQty}+ pcs)</td>
                <td>${formatNaira(product.wholesalePrice)}</td>
            </tr>
        `;
    }

    // Price updates based on mode and quantities selection
    function updateCalculatedPrice() {
        const qty = parseInt(quantityInput.value) || 1;
        const currentMode = getPricingMode();
        
        // Checks wholesale requirement
        const isWholesale = (currentMode === 'wholesale') || (qty >= product.wholesaleMinQty);
        const activeUnitPrice = isWholesale ? product.wholesalePrice : product.price;
        const totalPrice = activeUnitPrice * qty;

        // Unit price display updates
        if (pPrice) {
            pPrice.textContent = formatNaira(activeUnitPrice);
        }
        
        if (pPriceNote) {
            if (isWholesale) {
                pPriceNote.textContent = `Wholesale rate applied (saved ${formatNaira((product.price - product.wholesalePrice) * qty)} in total!)`;
                pPriceNote.style.color = 'var(--success)';
            } else {
                pPriceNote.textContent = `Add ${product.wholesaleMinQty - qty} more to unlock wholesale price (${formatNaira(product.wholesalePrice)} each)`;
                pPriceNote.style.color = 'var(--text-secondary)';
            }
        }

        // Subtotal calculated estimation display
        if (totalCalcPrice) {
            totalCalcPrice.textContent = formatNaira(totalPrice);
        }
    }

    // Monitor input quantity increments/decrements
    if (qtyMinus && quantityInput) {
        qtyMinus.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
                updateCalculatedPrice();
            }
        });
    }

    if (qtyPlus && quantityInput) {
        qtyPlus.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            quantityInput.value = val + 1;
            updateCalculatedPrice();
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener('change', () => {
            let val = parseInt(quantityInput.value) || 1;
            if (val < 1) quantityInput.value = 1;
            updateCalculatedPrice();
        });
    }

    // Initial price computation
    updateCalculatedPrice();
    window.addEventListener('pricingModeChanged', updateCalculatedPrice);

    // Event hooks on checkout addition buttons
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const qty = parseInt(quantityInput.value) || 1;
            CartManager.addItem(product.id, qty, selectedSize, selectedColor);
        });
    }

    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            const qty = parseInt(quantityInput.value) || 1;
            // Clear current cart first or just add and redirect
            CartManager.addItem(product.id, qty, selectedSize, selectedColor);
            window.location.href = 'checkout.html';
        });
    }

    // Related Products Render
    const relatedGrid = document.getElementById('related-products-grid');
    if (relatedGrid) {
        const related = products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4);

        if (related.length > 0) {
            relatedGrid.innerHTML = related.map(p => `
                <div class="product-card glass-panel">
                    <div class="product-image-wrap">
                        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
                        <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy">
                        <div class="product-actions-overlay">
                            <button class="action-btn" onclick="quickView('${p.id}')" title="View Detail">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${p.category}</span>
                        <h3 class="product-title"><a href="product.html?id=${p.id}">${p.name}</a></h3>
                        <div class="product-price-wrap">
                            <span class="product-price">${formatNaira(p.price)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            relatedGrid.closest('.section').style.display = 'none';
        }
    }
}

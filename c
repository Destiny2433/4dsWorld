# 4D'S World - Implementation Task List (Round 2)

> Progress tracker for feedback round.

---

## 1. Delivery Options (free, no pricing)
- [ ] `checkout.html`: add delivery method radio selector (Standard / Express / Store Pickup).
- [ ] `js/checkout.js`: handle selected delivery method (all free), send `deliveryMethod`.
- [ ] `app.py`: accept + store `deliveryMethod` and `deliveryFee` (0) on order.
- [ ] `cart.html` + `js/cart.js`: show "Delivery selected at checkout".

## 2. Fix Push Notifications (reach phone reliably)
- [ ] `app.py`: persist VAPID keys in `.vapid_keys.json` so they don't regenerate on restart.
- [ ] `app.py`: add `/api/admin/test-push` endpoint for testing.
- [ ] `admin.html` + `js/admin.js`: add "Send Test Push" button + real-time order/message push already wired.
- [ ] Verify new order & contact message triggers push to phone.

## 3. Smarter site (admin + forms + everywhere)
- [ ] `admin.html`/`js/admin.js`: order status management, stock toggle, refresh, empty states.
- [ ] `checkout.html`/`js/checkout.js`: inline validation + loading states.
- [ ] `contact.html`: loading + disabled submit state.
- [ ] `css/style.css` + `css/responsive.css`: polish + accessibility.

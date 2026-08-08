# 4D'S World - Implementation Task List

> Progress tracker for the approved changes.

---

## 1. Backend: Clean URLs + Admin Security
- [x] `app.py`: Add `before_request` hook to redirect `.html` URLs to clean, auth-checked routes.
- [x] Create `robots.txt` to block admin URLs from search engines.

## 2. Logo Replacement (logoo.png)
- [x] All 7 store pages + layout.js + admin: header/footer/preloader logo → `logoo.png`
- [x] Add favicon / apple-touch-icon (`logoo.png`) to `<head>` of each store page.

## 3. Restyle (beauty + organization)
- [x] `css/style.css`: refine theme (gold/dark), section headers, cards, hover, hero, wholesale, footer.
- [x] Add `.logo-img` responsive sizing.
- [~] `css/responsive.css`: clean mobile behaviour (in progress).

## 4. Admin Features
- [x] `js/admin.js`: verify dashboard shows by default, data loads reliably.
- [x] Add "Send Test Push" button + handler.
- [x] **Order Management**: Add delete-order endpoint + UI.
- [x] **Order Product Images**: Show product image(s) in order rows.
- [x] **Call Customer Button**: Add tel: call button using customer phone from checkout.
- [x] Order status management UI (Pending/Paid/Shipped/Delivered/Cancelled).

## 5. Testing
- [ ] Restart Flask app (`python app.py`).
- [ ] Visit `/admin-portal` — confirm login required + dashboard loads.
- [ ] Confirm `.html` URLs redirect to clean URLs.
- [ ] Confirm admin page NOT indexed.
- [ ] Verify all pages render new logo + styling.
</content>

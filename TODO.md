# PostgreSQL Migration Plan - Progress Tracker

## Steps
- [x] Step 1: Create `db_utils.py` — centralized DB handler (SQLite local + PostgreSQL Render)
- [x] Step 2: Update `requirements.txt` — add `psycopg2-binary`
- [x] Step 3: Update `app.py` — use `db_utils.get_db()` instead of raw `sqlite3`
- [x] Step 4: Rewrite `init_db.py` — use `db_utils` module
- [x] Step 5: Install dependencies locally
- [x] Step 6: Test locally with SQLite (no changes needed) — ✅ Already working
- [ ] Step 7: Test locally with PostgreSQL — Set `DATABASE_URL` to External URL and run `python init_db.py`
- [ ] Step 8: Deploy to Render — Set `DATABASE_URL` Render env var to Internal Database URL


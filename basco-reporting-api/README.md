# BASCO Intelligence Portal — API Backend

A Django + Django REST Framework backend that powers the BASCO Intelligence
Portal, an internal reporting platform for BASCO/Red Baron operations.  The
API authenticates users with JWT tokens, manages user accounts in a dedicated
SQL Server database (`BASCO_REPORTING_AUTH`), and executes raw reporting
queries against a read-only data warehouse (`BLUE_BASCO`) on the same server.

---

## Folder responsibilities

| Folder | Responsibility |
|---|---|
| `config/` | Django project configuration. Split settings (`base`, `local`, `production`), root URL conf, and WSGI entry-point live here. |
| `config/settings/` | Environment-specific settings files. `base.py` holds shared config; `local.py` and `production.py` override only what differs. |
| `apps/` | All Django applications (feature domains). Each sub-folder is a self-contained Django app. |
| `apps/accounts/` | User model, authentication, JWT token views. |
| `apps/reports/` | Reporting endpoints — reads from the BLUE_BASCO warehouse via raw SQL. |
| `apps/admin_panel/` | Admin-facing endpoints for user and permission management. |
| `core/` | Shared infrastructure utilities used across apps. Currently contains the raw pyodbc warehouse connection helper (`db.py`) and the database router (`routers.py`). |

---

## Local setup

### Prerequisites
- Python 3.11+
- [ODBC Driver 17 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) installed on your machine
- Network access to the SQL Server at `20.192.13.190`

### Steps

```bash
# 1. Clone the repo and enter the project directory
cd basco-reporting-api

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
# Then open .env and fill in all the blank values (DB credentials, SECRET_KEY, etc.)

# 5. Run database migrations (writes to BASCO_REPORTING_AUTH only)
python manage.py migrate

# 6. Start the development server
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/`.

---

## Settings files

| Environment | Settings module | How to activate |
|---|---|---|
| Local development | `config.settings.local` | **Default** — `manage.py` and `wsgi.py` both default to this. Nothing to do. |
| Production | `config.settings.production` | Set `DJANGO_SETTINGS_MODULE=config.settings.production` in your server process environment (systemd unit, gunicorn command, Docker env var, etc.) |

To run a single command with production settings without changing your shell:

```bash
DJANGO_SETTINGS_MODULE=config.settings.production python manage.py check --deploy
```

---

## Database connections

| Alias | Database | Purpose |
|---|---|---|
| `default` | `BASCO_REPORTING_AUTH` | Django-managed: users, sessions, tokens. Run migrations here. |
| `warehouse` | `BLUE_BASCO` | Read-only reporting. Use `core.db.get_warehouse_connection()` for raw SQL queries. **Never run migrations here.** |

---

## Generating a SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Paste the output into `SECRET_KEY=` in your `.env` file.

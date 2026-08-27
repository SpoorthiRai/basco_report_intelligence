"""
core/db.py
----------
Raw database connection helpers for the BASCO Intelligence Portal.

WHY THIS FILE EXISTS
--------------------
The BLUE_BASCO warehouse database is a legacy SQL Server instance that
Django never manages (no migrations, no ORM models).  All reporting queries
must be written as raw SQL and executed through a direct pyodbc connection,
NOT through Django's ORM.

WHEN TO USE get_warehouse_connection()
---------------------------------------
Use this function whenever you need to run a SELECT query against the
BLUE_BASCO warehouse.  Examples:
  - Fetching aggregated sales/route data for a report endpoint
  - Executing stored procedures in the warehouse
  - Any read-only analytical query that hits BLUE_BASCO

WHEN *NOT* TO USE IT
--------------------
Do NOT use this for anything touching BASCO_REPORTING_AUTH (users, sessions,
tokens, permissions).  For that, use Django's ORM with the 'default' database
connection as normal.

USAGE EXAMPLE
-------------
    from core.db import get_warehouse_connection

    def get_monthly_sales(year: int, month: int) -> list[dict]:
        conn = get_warehouse_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM dbo.MonthlySales WHERE Year=? AND Month=?",
                (year, month),
            )
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        finally:
            conn.close()  # always close — no connection pooling at this layer
"""

import pyodbc
from decouple import config


def get_warehouse_connection() -> pyodbc.Connection:
    """
    Returns a raw pyodbc connection to the BLUE_BASCO warehouse database.

    This connection is intentionally separate from Django's DATABASES config
    so that it can never be used with the ORM or migrations.  The caller is
    responsible for closing the connection (use a try/finally block).

    All credentials are read from environment variables at call time, which
    means no secrets are embedded in source code.

    Returns:
        pyodbc.Connection: An open connection to the warehouse DB.

    Raises:
        pyodbc.Error: If the connection cannot be established (bad credentials,
                      network unreachable, missing ODBC driver, etc.).
    """
    server = config("WAREHOUSE_DB_SERVER")
    database = config("WAREHOUSE_DB_NAME", default="BLUE_BASCO")
    username = config("WAREHOUSE_DB_USER")
    password = config("WAREHOUSE_DB_PASS")
    port = config("WAREHOUSE_DB_PORT", default="1433")

    available_drivers = pyodbc.drivers()
    if "ODBC Driver 18 for SQL Server" in available_drivers:
        default_driver = "ODBC Driver 18 for SQL Server"
    elif "ODBC Driver 17 for SQL Server" in available_drivers:
        default_driver = "ODBC Driver 17 for SQL Server"
    else:
        default_driver = "ODBC Driver 18 for SQL Server"

    driver = config("DB_DRIVER", default=default_driver)

    connection_string = (
        f"DRIVER={{{driver}}};"
        f"SERVER={server},{port};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        f"TrustServerCertificate=yes;"
    )

    return pyodbc.connect(connection_string)

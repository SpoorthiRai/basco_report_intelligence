"""
core/routers.py
---------------
Custom database router that prevents Django from running migrations on the
'warehouse' (BLUE_BASCO) database.

The warehouse is a read-only legacy system. Django must never attempt to
create, alter, or drop tables there.
"""


class WarehouseReadOnlyRouter:
    """
    Routes all database operations so that:
      - The 'warehouse' alias is never migrated
      - All model reads/writes go to 'default'
    """

    WAREHOUSE_ALIAS = "warehouse"

    def db_for_read(self, model, **hints):
        """All model reads use the default DB."""
        return "default"

    def db_for_write(self, model, **hints):
        """All model writes use the default DB."""
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations between objects in the same database."""
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Only allow migrations on the 'default' database.
        Returning False for 'warehouse' ensures `manage.py migrate` never
        touches BLUE_BASCO, even if called with --database=warehouse.
        """
        if db == self.WAREHOUSE_ALIAS:
            return False
        return True

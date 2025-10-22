from app.database import engine, Base
from app.models import User, ExcelData
from sqlalchemy import inspect

print("🔄 Creando tablas...")

# Crear todas las tablas
Base.metadata.create_all(bind=engine)

# Verificar tablas creadas
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"✅ Tablas creadas: {tables}")

# Ver columnas de cada tabla
for table_name in tables:
    print(f"\n📋 Tabla: {table_name}")
    columns = inspector.get_columns(table_name)
    for column in columns:
        print(f"  - {column['name']}: {column['type']}")
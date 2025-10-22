#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

from app import database, models
from sqlalchemy import inspect

print("🔗 Conectando a la base de datos...")
print(f"URL: {database.SQLALCHEMY_DATABASE_URL}")

try:
    # Probar conexión
    connection = database.engine.connect()
    print("✅ Conexión exitosa")
    connection.close()
    
    # Crear tablas
    print("\n🔄 Creando tablas...")
    models.Base.metadata.create_all(bind=database.engine)
    
    # Verificar tablas
    inspector = inspect(database.engine)
    tables = inspector.get_table_names()
    
    print(f"\n✅ Tablas en la base de datos: {tables}")
    
    # Mostrar estructura de cada tabla
    for table_name in tables:
        print(f"\n📋 Estructura de '{table_name}':")
        columns = inspector.get_columns(table_name)
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

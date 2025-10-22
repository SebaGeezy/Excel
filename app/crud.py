from app import database, models
import json
from typing import Optional
from sqlalchemy.orm import Session

# ============== FUNCIONES DE EXCEL (TUS FUNCIONES EXISTENTES) ==============

def insert_excel_data(df, file_name: str):
    db = database.SessionLocal()
    try:
        records = []
        print(f"📊 Insertando datos del archivo: {file_name}")
        for index, row in df.iterrows():
            row_dict = row.to_dict()
            record = models.ExcelData(
                row_data=json.dumps(row_dict, default=str),
                file_name=file_name
            )
            records.append(record)
        db.add_all(records)
        db.commit()
        print(f"✅ Total de filas insertadas: {len(records)}")
        return len(records)
    except Exception as e:
        db.rollback()
        print(f"❌ Error al insertar datos: {e}")
        raise e
    finally:
        db.close()


def get_all_data(show_deleted: bool = False):
    db = database.SessionLocal()
    try:
        print("🔍 Consultando datos de Excel")
        query = db.query(models.ExcelData)
        if not show_deleted:
            query = query.filter(models.ExcelData.is_deleted == False)
        data = query.all()
        print(f"📋 Registros encontrados: {len(data)}")
        return data
    finally:
        db.close()


def logical_delete_excel(filename: str):
    db = database.SessionLocal()
    try:
        print(f"🗑️ Marcando como eliminados los registros del archivo: {filename}")
        records = db.query(models.ExcelData).filter(models.ExcelData.file_name == filename)
        count = records.update({"is_deleted": True})
        db.commit()
        print(f"✅ Registros marcados como eliminados: {count}")
        return count
    except Exception as e:
        db.rollback()
        print(f"❌ Error en borrado lógico: {e}")
        raise e
    finally:
        db.close()


# ============== FUNCIONES DE AUTENTICACIÓN (NUEVAS) ==============

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """Obtener usuario por nombre de usuario"""
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Obtener usuario por email"""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, username: str, email: str, full_name: str, hashed_password: str, role: str = "usuario") -> models.User:
    """Crear un nuevo usuario"""
    db_user = models.User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    print(f"✅ Usuario creado: {username} (Rol: {role})")
    return db_user


def get_all_users(db: Session):
    """Obtener todos los usuarios"""
    return db.query(models.User).all()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    """Obtener usuario por ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()


def update_user_status(db: Session, user_id: int, is_active: bool):
    """Activar o desactivar un usuario"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.is_active = is_active
        db.commit()
        db.refresh(user)
        print(f"✅ Usuario {user.username} {'activado' if is_active else 'desactivado'}")
        return user
    return None
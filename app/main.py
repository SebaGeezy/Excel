from fastapi import FastAPI, UploadFile, File, HTTPException, Path, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import pandas as pd
import json
import os

# Imports locales
from app import database, crud, models, schemas, utils
from app.dependencies import get_current_active_user, require_admin

app = FastAPI(
    title="Cargador de Excel con Autenticación",
    description="API para subir archivos Excel con sistema de login y roles",
    version="2.0.0"
)

os.makedirs("uploads", exist_ok=True)

# ============== CORS ==============
origins = ["http://localhost:4200", "http://localhost:8080", "http://localhost:8001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== STARTUP ==============
@app.on_event("startup")
def startup():
    print("🔄 Intentando crear tablas...")
    try:
        # Importar models para asegurar que Base tenga todos los modelos
        from app import models
        
        # Crear todas las tablas
        models.Base.metadata.create_all(bind=database.engine)
        
        print("✅ Tablas creadas correctamente")
        
        # Verificar tablas creadas
        from sqlalchemy import inspect
        inspector = inspect(database.engine)
        tables = inspector.get_table_names()
        print(f"📋 Tablas en la base de datos: {tables}")
        
    except Exception as e:
        print(f"❌ Error al crear tablas: {e}")
        raise e

# ============================================================
# RUTAS DE AUTENTICACIÓN
# ============================================================

@app.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["Autenticación"])
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    📝 Registro de nuevos usuarios.
    Todos los usuarios se crean con rol 'usuario' por defecto.
    """
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_password = utils.get_password_hash(user.password)
    db_user = crud.create_user(
        db=db,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role="usuario"
    )
    
    print(f"✅ Usuario registrado: {user.username}")
    return db_user


@app.post("/auth/login", response_model=schemas.Token, tags=["Autenticación"])
def login(user_credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    """
    🔐 Login de usuarios.
    Devuelve un token JWT para autenticación.
    """
    user = utils.authenticate_user(db, user_credentials.username, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    
    access_token_expires = timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.username, "role": user.role.value if hasattr(user.role, 'value') else user.role},
        expires_delta=access_token_expires
    )
    
    print(f"✅ Login exitoso: {user.username} ({user.role})")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/auth/me", response_model=schemas.UserResponse, tags=["Autenticación"])
def get_current_user_info(current_user: models.User = Depends(get_current_active_user)):
    """👤 Obtener información del usuario autenticado actual"""
    return current_user


@app.post("/create-admin", response_model=schemas.UserResponse, tags=["Admin - Temporal"])
def create_admin_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """⚠️ TEMPORAL: Solo para crear el primer administrador"""
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    hashed_password = utils.get_password_hash(user.password)
    db_user = crud.create_user(
        db=db,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role="admin"
    )
    
    print(f"✅ Administrador creado: {user.username}")
    return db_user


# ============================================================
# RUTAS DE EXCEL (PROTEGIDAS)
# ============================================================

@app.post("/upload_excel/", tags=["Excel"])
async def upload_excel(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_admin)  # ⚠️ SOLO ADMIN
):
    """📤 Subir archivo Excel - Solo administradores"""
    print(f"📁 Archivo recibido: {file.filename} | Usuario: {current_user.username}")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel")

    file_location = f"uploads/{file.filename}"
    
    try:
        with open(file_location, "wb") as f:
            content = await file.read()
            f.write(content)

        df = pd.read_excel(file_location)
        rows_processed = crud.insert_excel_data(df, file.filename)
        
        print(f"✅ Archivo procesado: {file.filename} | Filas: {rows_processed}")
        
        return {
            "message": "Archivo procesado correctamente",
            "filename": file.filename,
            "rows_processed": rows_processed,
            "columns": list(df.columns),
            "uploaded_by": current_user.username,
            "user_role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        }
    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")


@app.get("/data/", tags=["Excel"])
def get_data(
    showDeleted: bool = False,
    current_user: models.User = Depends(get_current_active_user)  # ✅ Usuarios autenticados
):
    """📊 Obtener datos de Excel - Todos los usuarios autenticados"""
    print(f"🔍 Consultando datos | Usuario: {current_user.username}")
    
    try:
        data = crud.get_all_data(show_deleted=showDeleted)
        result = []
        for item in data:
            try:
                row_data = json.loads(item.row_data) if item.row_data else {}
            except Exception as e:
                print(f"Error parsing row_data: {e}")
                row_data = {}
            result.append({
                "id": item.id,
                "file_name": item.file_name,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "row_data": row_data,
                "is_deleted": item.is_deleted
            })
        
        print(f"✅ Registros encontrados: {len(result)}")
        
        return {
            "total_records": len(result),
            "data": result,
            "viewed_by": current_user.username,
            "user_role": current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        }
    except Exception as e:
        print(f"Error in get_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete_excel/{filename}", tags=["Excel"])
async def delete_excel(
    filename: str = Path(..., description="Nombre del archivo Excel a eliminar"),
    current_user: models.User = Depends(require_admin)  # ⚠️ SOLO ADMIN
):
    """🗑️ Borrado lógico de Excel - Solo administradores"""
    print(f"🗑️ Eliminando archivo: {filename} | Usuario: {current_user.username}")
    
    try:
        deleted_count = crud.logical_delete_excel(filename)
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"No se encontraron registros del archivo: {filename}")
        
        file_path = f"uploads/{filename}"
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {
            "message": "Archivo marcado como eliminado",
            "filename": filename,
            "db_records_updated": deleted_count,
            "deleted_by": current_user.username
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en borrado lógico: {e}")


# ============================================================
# RUTAS ADMINISTRATIVAS
# ============================================================

@app.get("/admin/users", tags=["Admin"])
def list_all_users(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(require_admin)
):
    """👥 Listar todos los usuarios - Solo administradores"""
    users = crud.get_all_users(db)
    return {
        "total_users": len(users),
        "users": users,
        "requested_by": current_user.username
    }


# ============================================================
# RUTAS DE INFORMACIÓN
# ============================================================

@app.get("/", tags=["Info"])
async def root():
    return {
        "message": "Backend API is running with Authentication",
        "version": "2.0.0",
        "status": "active"
    }


@app.get("/health", tags=["Info"])
def health_check():
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/test/", tags=["Info"])
async def test_endpoint():
    return {"message": "Test endpoint is working"}
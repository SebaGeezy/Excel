from fastapi import FastAPI, UploadFile, File, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import database
import crud
import models

import json
import os

app = FastAPI(title="Cargador de Excel con Borrado Lógico")
os.makedirs("uploads", exist_ok=True)

origins = ["http://localhost:4200", "http://localhost:8080", "http://localhost:8001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Backend API is running"}

@app.on_event("startup")
def startup():
    database.Base.metadata.create_all(bind=database.engine)
    print(" Tablas creadas correctamente")

@app.post("/upload_excel/")
async def upload_excel(file: UploadFile = File(...)):
    print(f" Archivo recibido: {file.filename}")
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos Excel")

    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)

    df = pd.read_excel(file_location)
    rows_processed = crud.insert_excel_data(df, file.filename)
    return {
        "message": "Archivo procesado correctamente",
        "filename": file.filename,
        "rows_processed": rows_processed,
        "columns": list(df.columns)
    }

@app.get("/data/")
def get_data(showDeleted: bool = False):
    print("Accessing /data/ endpoint")  # Debug print
    try:
        data = crud.get_all_data(show_deleted=showDeleted)
        result = []
        for item in data:
            try:
                row_data = json.loads(item.row_data) if item.row_data else {}
            except Exception as e:
                print(f"Error parsing row_data: {e}")  # Debug print
                row_data = {}
            result.append({
                "id": item.id,
                "file_name": item.file_name,
                "upload_date": item.upload_date.isoformat() if item.upload_date else None,
                "row_data": row_data,
                "is_deleted": item.is_deleted
            })
        print(f"Returning {len(result)} items")  # Debug print
        return result
    except Exception as e:
        print(f"Error in get_data: {e}")  # Debug print
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete_excel/{filename}")
async def delete_excel(filename: str = Path(..., description="Nombre del archivo Excel a eliminar")):
    try:
        deleted_count = crud.logical_delete_excel(filename)
        return {
            "message": "Archivo marcado como eliminado",
            "filename": filename,
            "db_records_updated": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en borrado lógico: {e}")

# New test endpoint
@app.get("/test/")
async def test_endpoint():
    return {"message": "Test endpoint is working"}

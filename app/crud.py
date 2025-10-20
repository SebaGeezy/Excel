import database
import crud
import models


import json

def insert_excel_data(df, file_name: str):
    db = database.SessionLocal()
    try:
        records = []
        print(f" Insertando datos del archivo: {file_name}")
        for index, row in df.iterrows():
            row_dict = row.to_dict()
            record = models.ExcelData(
                row_data=json.dumps(row_dict, default=str),
                file_name=file_name
            )
            records.append(record)
        db.add_all(records)
        db.commit()
        print(f" Total de filas insertadas: {len(records)}")
        return len(records)
    except Exception as e:
        db.rollback()
        print(f" Error al insertar datos: {e}")
        raise e
    finally:
        db.close()


def get_all_data(show_deleted: bool = False):
    db = database.SessionLocal()
    try:
        print(" Consultando datos de Excel")
        query = db.query(models.ExcelData)
        if not show_deleted:
            query = query.filter(models.ExcelData.is_deleted == False)
        data = query.all()
        print(f" Registros encontrados: {len(data)}")
        return data
    finally:
        db.close()


def logical_delete_excel(filename: str):
    db = database.SessionLocal()
    try:
        print(f" Marcando como eliminados los registros del archivo: {filename}")
        records = db.query(models.ExcelData).filter(models.ExcelData.file_name == filename)
        count = records.update({"is_deleted": True})
        db.commit()
        print(f" Registros marcados como eliminados: {count}")
        return count
    except Exception as e:
        db.rollback()
        print(f" Error en borrado lógico: {e}")
        raise e
    finally:
        db.close()

from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ExcelDataBase(BaseModel):
    file_name: str
    row_data: Any
    upload_date: Optional[datetime]
    is_deleted: bool = False

    class Config:
        orm_mode = True

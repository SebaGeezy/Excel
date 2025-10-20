from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base


class ExcelData(Base):
    __tablename__ = "excel_data"

    id = Column(Integer, primary_key=True, index=True)
    row_data = Column(Text)
    file_name = Column(String(255))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    is_deleted = Column(Boolean, default=False)

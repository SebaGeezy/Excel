from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime

# ============== SCHEMAS DE EXCEL (EXISTENTES) ==============
class ExcelDataBase(BaseModel):
    file_name: str
    row_data: Any
    created_at: Optional[datetime]
    is_deleted: bool = False

    class Config:
        from_attributes = True


# ============== SCHEMAS DE AUTENTICACIÓN (NUEVOS) ==============
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
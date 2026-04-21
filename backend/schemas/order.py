from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from models.purchase_order import POStatus

class OrderCreate(BaseModel):
    po_number: str
    organization_name: str
    supplier_name: str
    supplier_email: str
    item_description: str
    quantity: int
    expected_delivery: datetime
    user_id: str

class OrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    actual_delivery: Optional[datetime] = None
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: UUID
    po_number: str
    supplier_name: str
    supplier_email: str
    item_description: str
    quantity: int
    expected_delivery: datetime
    actual_delivery: Optional[datetime]
    status: POStatus
    supplier_token: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
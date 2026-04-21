from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.purchase_order import PurchaseOrder, POStatus, Organization
from schemas.order import OrderCreate, OrderUpdate, OrderResponse
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # Create org if needed (simplified for now)
    org = db.query(Organization).filter(Organization.name == order.organization_name).first()
    if not org:
        org = Organization(name=order.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)
    
    db_order = PurchaseOrder(
        po_number=order.po_number,
        organization_id=org.id,
        supplier_name=order.supplier_name,
        supplier_email=order.supplier_email,
        item_description=order.item_description,
        quantity=order.quantity,
        expected_delivery=order.expected_delivery,
        status=POStatus.pending,
        supplier_token=str(uuid.uuid4())
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/", response_model=list[OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(PurchaseOrder).all()

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/supplier/{token}")
def supplier_update(token: str, update: OrderUpdate, db: Session = Depends(get_db)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    if update.status:
        order.status = update.status
    if update.actual_delivery:
        order.actual_delivery = update.actual_delivery
    if update.notes:
        order.notes = update.notes
    
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return {"message": "Updated successfully", "status": order.status}

@router.get("/supplier/{token}")
def get_order_by_token(token: str, db: Session = Depends(get_db)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.supplier_token == token).first()
    if not order:
        raise HTTPException(status_code=404, detail="Invalid token")
    return order
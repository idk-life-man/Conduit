from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.purchase_order import PurchaseOrder, POStatus, Organization
from schemas.order import OrderCreate, OrderUpdate, OrderResponse
import uuid
from datetime import datetime
from email_utils import send_supplier_notification

router = APIRouter()

@router.post("/", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.name == order.organization_name).first()
    if not org:
        org = Organization(name=order.organization_name)
        db.add(org)
        db.commit()
        db.refresh(org)
    
    db_order = PurchaseOrder(
        po_number=order.po_number,
        organization_id=org.id,
        user_id=order.user_id,
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
    
    send_supplier_notification(
        supplier_email=db_order.supplier_email,
        supplier_name=db_order.supplier_name,
        po_number=db_order.po_number,
        item_description=db_order.item_description,
        quantity=db_order.quantity,
        expected_delivery=db_order.expected_delivery.strftime("%B %d, %Y"),
        supplier_token=db_order.supplier_token
    )
    
    return db_order

@router.get("/", response_model=list[OrderResponse])
def get_orders(user_id: str, db: Session = Depends(get_db)):
    return db.query(PurchaseOrder).filter(PurchaseOrder.user_id == user_id).all()

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

@router.get("/suppliers/reliability")
def get_supplier_reliability(user_id: str, db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).filter(
        PurchaseOrder.user_id == user_id,
        PurchaseOrder.status == POStatus.delivered
    ).all()

    suppliers = {}
    for order in orders:
        name = order.supplier_name
        if name not in suppliers:
            suppliers[name] = {"total": 0, "on_time": 0, "late": 0}
        
        suppliers[name]["total"] += 1
        
        if order.actual_delivery and order.actual_delivery <= order.expected_delivery:
            suppliers[name]["on_time"] += 1
        else:
            suppliers[name]["late"] += 1

    result = []
    for name, data in suppliers.items():
        score = round((data["on_time"] / data["total"]) * 100) if data["total"] > 0 else 0
        result.append({
            "supplier_name": name,
            "total_orders": data["total"],
            "on_time": data["on_time"],
            "late": data["late"],
            "reliability_score": score
        })

    return sorted(result, key=lambda x: x["reliability_score"], reverse=True)
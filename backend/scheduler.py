from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
from models.purchase_order import PurchaseOrder, POStatus
from email_utils import send_reminder_email
from datetime import datetime, timedelta

def check_and_send_reminders():
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        two_days_ago = now - timedelta(days=2)

        stale_orders = db.query(PurchaseOrder).filter(
            PurchaseOrder.status.notin_([POStatus.delivered]),
            PurchaseOrder.updated_at < two_days_ago
        ).all()

        for order in stale_orders:
            days_overdue = (now - order.expected_delivery).days if order.expected_delivery < now else 0
            send_reminder_email(
                supplier_email=order.supplier_email,
                supplier_name=order.supplier_name,
                po_number=order.po_number,
                item_description=order.item_description,
                expected_delivery=order.expected_delivery.strftime("%B %d, %Y"),
                supplier_token=order.supplier_token,
                days_overdue=days_overdue
            )
            print(f"Reminder sent for {order.po_number} to {order.supplier_email}")

    except Exception as e:
        print(f"Scheduler error: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_and_send_reminders, 'interval', hours=24)
    scheduler.start()
    return scheduler
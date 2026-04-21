import resend
import os
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

def send_supplier_notification(
    supplier_email: str,
    supplier_name: str,
    po_number: str,
    item_description: str,
    quantity: int,
    expected_delivery: str,
    supplier_token: str
):
    link = f"https://localhost:3000/supplier/{supplier_token}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">New Purchase Order: {po_number}</h2>
        
        <p>Hi {supplier_name},</p>
        
        <p>A new purchase order has been created and requires your confirmation.</p>
        
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #666;">PO Number</td>
                    <td style="padding: 8px 0; font-weight: bold;">{po_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Item</td>
                    <td style="padding: 8px 0; font-weight: bold;">{item_description}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Quantity</td>
                    <td style="padding: 8px 0; font-weight: bold;">{quantity}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Expected Delivery</td>
                    <td style="padding: 8px 0; font-weight: bold;">{expected_delivery}</td>
                </tr>
            </table>
        </div>
        
        <p>Please click the button below to confirm or update the delivery status:</p>
        
        <a href="{link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 10px 0;">
            Update Delivery Status
        </a>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
            If the button doesn't work, copy this link: {link}
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Powered by Conduit</p>
    </div>
    """
    
    try:
        resend.Emails.send({
            "from": "Conduit <onboarding@resend.dev>",
            "to": supplier_email,
            "subject": f"Purchase Order {po_number} - Action Required",
            "html": html
        })
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False
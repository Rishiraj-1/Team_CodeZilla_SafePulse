import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config.settings import get_settings

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def send_application_decision_email(to_email: str, name: str, decision: str):
    """
    Sends an approval or rejection styled HTML email.
    Uses FRONTEND_URL from environment configuration for email links.
    If SMTP credentials are not configured, it fails silently to avoid breaking the application flow.
    """
    if not SMTP_USER or not SMTP_PASS:
        print(f"[WARN] Email not sent to {to_email}. SMTP credentials are not configured.")
        return

    settings = get_settings()
    frontend_url = settings.FRONTEND_URL
    login_link = f"{frontend_url}/login"
    
    is_approved = decision.strip().upper() == "APPROVED"
    subject = "SafePulse Authority Application Approved" if is_approved else "SafePulse Authority Application Update"
    
    if is_approved:
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #b787f5;">SafePulse Account Approved</h2>
            <p>Dear {name},</p>
            <p>We are pleased to inform you that your application for an Authority account on the SafePulse network has been <strong>approved</strong>.</p>
            <p>You can now log in to the SafePulse command center and access the dashboard.</p>
            <br/>
            <a href="{login_link}" style="background-color: #b787f5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Log in to Dashboard</a>
            <br/><br/>
            <p>Thank you for contributing to public safety.</p>
            <p style="color: #666; font-size: 12px;">The SafePulse Administration Team</p>
        </body>
        </html>
        """
    else:
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">SafePulse Application Update</h2>
            <p>Dear {name},</p>
            <p>Thank you for your interest in joining the SafePulse network as an Authority. We have reviewed your application.</p>
            <p>We regret to inform you that we are <strong>unable to approve</strong> your request at this time.</p>
            <p>If you believe this decision was made in error or if you have additional credentials to provide, please contact your local system administrator.</p>
            <br/>
            <p>Thank you,</p>
            <p style="color: #666; font-size: 12px;">The SafePulse Administration Team</p>
        </body>
        </html>
        """

    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        print(f"[INFO] Sent {decision} email to {to_email}")
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {e}")

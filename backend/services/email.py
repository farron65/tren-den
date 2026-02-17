from models import User

import resend
from config import RESEND_EMAIL_API_KEY


resend.api_key = RESEND_EMAIL_API_KEY

def send_password_reset_email(email: str, username: str, reset_token):
    params: resend.Emails.SendParams = {
        "from": "onboarding@resend.dev",
        "to": email,
        "subject": "Reset your password",
        "html":
            f"""
            <h1>Hello {username},</h1>
            <p>We received a request to reset your password<p>
            <a href="https://trenden.netlify.app/reset-password?token={reset_token}">Reset your password<a/>
            <strong>This link will expire in 15 minutes. If you did not request a new password, please disregard this message.</strong
            """
    }
    
    resend.Emails.send(params)
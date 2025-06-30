import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from backend.config import get_settings
from backend.logging import logging

settings = get_settings()

class EmailService:
    def __init__(self):
        self.smtp_server = settings.smtp_server
        self.smtp_port = settings.smtp_port
        self.email_username = settings.email_username
        self.email_password = settings.email_password

    async def send_matching_results_email(
        self, 
        recipients: List[str], 
        job_title: str, 
        top_matches: List[Dict[str, Any]],
        similarity_score: float
    ) -> bool:
        """Send email with matching results to AR requestor"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Matching Results for {job_title}"
            message["From"] = self.email_username
            message["To"] = ", ".join(recipients)

            # Create HTML content
            html_content = self._create_matching_results_html(job_title, top_matches, similarity_score)
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_username, self.email_password)
                server.sendmail(self.email_username, recipients, message.as_string())
            
            logging.info(f"Email sent successfully to {', '.join(recipients)}")
            return True
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            return False

    async def send_no_matches_email(
        self, 
        recipients: List[str], 
        job_title: str
    ) -> bool:
        """Send email when no suitable matches are found"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"No Matches Found for {job_title}"
            message["From"] = self.email_username
            message["To"] = ", ".join(recipients)

            html_content = f"""
            <html>
                <body>
                    <h2>No Suitable Matches Found</h2>
                    <p>Dear Recruiter,</p>
                    <p>We were unable to find suitable consultant matches for the job position: <strong>{job_title}</strong></p>
                    <p>Please review the job requirements or expand the search criteria.</p>
                    <br>
                    <p>Best regards,<br>RecruitMatch System</p>
                </body>
            </html>
            """
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_username, self.email_password)
                server.sendmail(self.email_username, recipients, message.as_string())
            
            logging.info(f"Email sent successfully to {', '.join(recipients)}")
            return True
        except Exception as e:
            logging.error(f"Failed to send email: {str(e)}")
            return False

    def _create_matching_results_html(
        self, 
        job_title: str, 
        top_matches: List[Dict[str, Any]], 
        similarity_score: float
    ) -> str:
        """Create HTML content for matching results email"""
        matches_html = ""
        for i, match in enumerate(top_matches[:3], 1):
            matches_html += f"""
            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <h4>#{i} - {match['consultant_name']}</h4>
                <p><strong>Match Score:</strong> {match['score']}%</p>
                <p><strong>Experience:</strong> {match['experience']} years</p>
                <p><strong>Matching Skills:</strong> {', '.join(match['matching_skills'])}</p>
                {f"<p><strong>Skills Gap:</strong> {', '.join(match['missing_skills'])}</p>" if match.get('missing_skills') else ""}
            </div>
            """

        return f"""
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Top Consultant Matches for {job_title}</h2>
                <p>Dear AR Requestor,</p>
                <p>We have found the following consultant matches for your job requirement:</p>
                <p><strong>Overall Similarity Score:</strong> {similarity_score}%</p>
                
                <h3>Top 3 Matches:</h3>
                {matches_html}
                
                <p>Please review these matches and contact the consultants directly for further discussion.</p>
                <br>
                <p>Best regards,<br>RecruitMatch System</p>
            </body>
        </html>
        """

email_service = EmailService()
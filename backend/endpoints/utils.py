import os
from docx import Document as DocxDocument
from PyPDF2 import PdfReader

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        reader = PdfReader(file_path)
        text = ''
        for page in reader.pages:
            text += page.extract_text() or ''
        return text
    elif ext in ['.docx']:
        doc = DocxDocument(file_path)
        return '\n'.join([para.text for para in doc.paragraphs])
    else:
        return '' 
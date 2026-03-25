import os

from pypdf import PdfReader

from app.core.config import settings


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returning a list of {page_number, content} dicts."""
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page_number": i + 1, "content": text.strip()})
    return pages


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def process_document(file_path: str) -> list[dict]:
    """Extract and chunk a PDF into pieces ready for embedding."""
    pages = extract_text_from_pdf(file_path)
    all_chunks = []
    idx = 0
    for page in pages:
        for chunk_text_content in chunk_text(page["content"]):
            all_chunks.append({
                "chunk_index": idx,
                "content": chunk_text_content,
                "page_number": page["page_number"],
            })
            idx += 1
    return all_chunks


def save_upload(filename: str, content: bytes) -> str:
    """Save uploaded file to disk, return the file path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path

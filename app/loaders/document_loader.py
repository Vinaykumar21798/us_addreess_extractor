from app.processors.pdf_processor import PDFProcessor
from app.processors.text_processor import TXTProcessor
from app.processors.docx_processor import DOCXProcessor


class DocumentLoader:

    def get_processor(self, file_type: str):

        processors = {
            "pdf": PDFProcessor(),
            "txt": TXTProcessor(),
            "docx": DOCXProcessor()
        }

        processor = processors.get(file_type)

        if not processor:
            raise ValueError(
                f"No processor found for file type: {file_type}"
            )

        return processor

    def load_file(self, file):

        filename = file.filename.lower()

        if filename.endswith(".pdf"):
            return self.get_processor("pdf")

        elif filename.endswith(".txt"):
            return self.get_processor("txt")

        elif filename.endswith(".docx"):
            return self.get_processor("docx")

        raise ValueError("Unsupported file type")
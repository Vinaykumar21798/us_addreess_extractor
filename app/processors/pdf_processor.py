from pypdf import PdfReader

from app.exceptions.custom_exceptions import (
    CorruptedPDFException,
    PasswordProtectedPDFException,
    NoExtractableTextException
)


class PDFProcessor:

    def extract_segments(self, file) -> list[dict]:
        """
        Extract text from a PDF document page by page.
        """
        import io

        try:
            file.file.seek(0)
            pdf_bytes = file.file.read()
            pdf_stream = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_stream)

            # Check for password protection
            if reader.is_encrypted:
                raise PasswordProtectedPDFException(
                    "This PDF is password protected and cannot be processed."
                )

            segments = []

            for idx, page in enumerate(reader.pages):
                text = page.extract_text()

                if text and text.strip():
                    segments.append({
                        "text": text.strip(),
                        "source": f"Page {idx + 1}"
                    })

            # Handle scanned/image-only PDFs
            if not segments:
                raise NoExtractableTextException(
                    "This document contains no readable text. OCR support is not currently available."
                )

            return segments

        except PasswordProtectedPDFException:
            raise

        except NoExtractableTextException:
            raise

        except Exception as e:
            raise CorruptedPDFException(
                f"Unable to read the PDF file: {str(e)}"
            )
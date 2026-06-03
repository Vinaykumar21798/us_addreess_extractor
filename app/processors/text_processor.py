import re

from app.exceptions.custom_exceptions import (
    NoExtractableTextException
)


class TXTProcessor:

    def extract_segments(self, file) -> list[dict]:
        """
        Extract text from a TXT file and split into paragraphs.
        """

        try:
            content = file.file.read()

            text = content.decode("utf-8").strip()

            if not text:
                raise NoExtractableTextException(
                    "The uploaded text file contains no readable content."
                )

            # Split text by double newlines to keep paragraph blocks together
            paragraphs = re.split(r'\n\s*\n', text)
            segments = []

            for idx, para in enumerate(paragraphs):
                if para.strip():
                    segments.append({
                        "text": para.strip(),
                        "source": f"Paragraph {idx + 1}"
                    })

            return segments

        except UnicodeDecodeError:
            raise NoExtractableTextException(
                "Unable to read the text file. Unsupported encoding."
            )
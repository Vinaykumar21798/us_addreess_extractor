from fastapi import UploadFile
from app.exceptions.custom_exceptions import (
    UnsupportedFileTypeException,
    EmptyFileException,
    FileSizeExceededException
)


class FileValidator:

    ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    async def validate_file(self, file: UploadFile) -> None:

        if not file:
            raise EmptyFileException("No file uploaded.")

        filename = file.filename.lower()

        if not any(filename.endswith(ext) for ext in self.ALLOWED_EXTENSIONS):
            raise UnsupportedFileTypeException(
                "Only PDF, TXT, and DOCX files are supported."
            )

        content = await file.read()

        if len(content) == 0:
            raise EmptyFileException(
                "The uploaded file is empty."
            )

        if len(content) > self.MAX_FILE_SIZE:
            raise FileSizeExceededException(
                "File size exceeds the allowed limit of 10 MB."
            )

        await file.seek(0)
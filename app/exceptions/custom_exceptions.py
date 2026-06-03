# app/exceptions/custom_exceptions.py

class UnsupportedFileTypeException(Exception):
    """Raised when the uploaded file type is not supported."""
    pass


class EmptyFileException(Exception):
    """Raised when the uploaded file is empty."""
    pass


class FileSizeExceededException(Exception):
    """Raised when uploaded file exceeds the allowed size."""
    pass


class CorruptedPDFException(Exception):
    """Raised when PDF cannot be read or is corrupted."""
    pass


class PasswordProtectedPDFException(Exception):
    """Raised when PDF is encrypted/password protected."""
    pass


class NoExtractableTextException(Exception):
    """Raised when no readable text can be extracted."""
    pass


class AuthenticationException(Exception):
    """Raised when Smarty returns 401."""
    pass


class QuotaExceededException(Exception):
    """Raised when Smarty returns 402."""
    pass


class NetworkException(Exception):
    """Raised when network connection or timeout fails."""
    pass


class InvalidAPIResponseException(Exception):
    """Raised when Smarty returns an unexpected response."""
    pass


class TextLimitExceededException(Exception):
    """Raised when extracted text exceeds Smarty's 1 MB limit."""
    pass
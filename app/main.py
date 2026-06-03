from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.services.address_service import AddressService
from app.models.address_response import AddressResponse

from app.exceptions.custom_exceptions import (
    UnsupportedFileTypeException,
    EmptyFileException,
    FileSizeExceededException,
    CorruptedPDFException,
    PasswordProtectedPDFException,
    NoExtractableTextException,
    AuthenticationException,
    QuotaExceededException,
    NetworkException,
    InvalidAPIResponseException,
    TextLimitExceededException
)

app = FastAPI(
    title="Address Extractor API",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

address_service = AddressService()


@app.get("/")
def home():
    return FileResponse("templates/index.html")


@app.post("/extract")
async def extract_addresses(file: UploadFile = File(...)):

    try:

        result = await address_service.process_document(file)

        message = "Addresses extracted successfully."
        if result.get("simulation_mode"):
            message = "Smarty API limit reached. Running in simulation mode."

        return AddressResponse(
            success=True,
            message=message,
            addresses=result.get("addresses", []),
            stats=result.get("stats", None)
        )

    except UnsupportedFileTypeException as e:
        return JSONResponse(
            status_code=400,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except EmptyFileException as e:
        return JSONResponse(
            status_code=400,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except FileSizeExceededException as e:
        return JSONResponse(
            status_code=413,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except CorruptedPDFException as e:
        return JSONResponse(
            status_code=400,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except PasswordProtectedPDFException as e:
        return JSONResponse(
            status_code=400,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except NoExtractableTextException as e:
        return JSONResponse(
            status_code=400,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except TextLimitExceededException as e:
        return JSONResponse(
            status_code=413,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except AuthenticationException as e:
        return JSONResponse(
            status_code=401,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except QuotaExceededException as e:
        return JSONResponse(
            status_code=402,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except NetworkException as e:
        return JSONResponse(
            status_code=503,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except InvalidAPIResponseException as e:
        return JSONResponse(
            status_code=500,
            content=AddressResponse(
                success=False,
                message=str(e),
                addresses=[]
            ).model_dump()
        )

    except Exception as e:

        import traceback

        print("\n========== ERROR ==========")
        traceback.print_exc()
        print("===========================\n")

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": str(e),
                "addresses": []
            }
        )
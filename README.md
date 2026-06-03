# Address Extractor

This is a simple web tool that helps you find and check US addresses from your documents. You can upload a PDF, Word document (.docx), or plain text file (.txt). The app reads the file, finds all US addresses in it, checks if they are real addresses using the Smarty API, and displays them on a clean, easy-to-use dashboard.

---

## What this tool does

*   **Reads PDF, Word, and Text files**: You can drop in any of these files to start scanning.
*   **Shows where addresses were found**: The app tells you exactly where in the file each address was located (like "Page 3" or "Section 1 Header").
*   **De-duplicates duplicates**: If the same address is found multiple times, the app merges them so you don't waste API credits.
*   **Handles big files**: If you upload a file with thousands of addresses, the app splits the text into small 50KB chunks so the Smarty API doesn't get overloaded.
*   **Simulation Mode (Fail-Safe)**: If your Smarty API key runs out of free lookups, or if the connection fails, the app won't crash. Instead, it automatically switches to a local simulation mode so you can still test all the features (like table filtering and exporting).
*   **Friendly Dashboard**: You can toggle between Light and Dark mode. It shows simple stats like total addresses found, verified count, and processing time.
*   **Interactive Results Table**: 
    *   **Search**: Type any city, state, or zip code to filter rows instantly.
    *   **Filter**: Quick dropdowns to filter by State or Verification status.
    *   **Sort**: Click on any column header to sort alphabetically.
    *   **Pagination**: Split results into pages (10, 25, or 50 rows per page).
    *   **Copy & Export**: Select specific rows (or export all) to download them as a CSV, Excel sheet, or copy them as JSON. You can also copy individual address text with one click.

---

## Tech Stack

*   **Backend**: Python, FastAPI
*   **Libraries**: Requests, Python-Docx, PyPDF, Python-Dotenv
*   **Frontend**: HTML, CSS, JavaScript (using Bootstrap 5 and Font Awesome icons)
*   **Excel Export**: SheetJS (loaded via CDN)

---

## Folder Structure

```text
address-extractor/
├── app/
│   ├── clients/
│   │   └── smarty_client.py       # Smarty API client with auto-retries
│   ├── exceptions/
│   │   └── custom_exceptions.py   # Custom errors
│   ├── loaders/
│   │   └── document_loader.py     # Selects the right file reader
│   ├── models/
│   │   └── address_response.py    # API response models
│   ├── processors/
│   │   ├── docx_processor.py      # Word document reader
│   │   ├── pdf_processor.py       # PDF document reader
│   │   └── text_processor.py      # Plain text reader
│   ├── services/
│   │   └── address_service.py     # Address logic, chunking, and mock simulation
│   └── main.py                    # App routes
├── static/
│   ├── script.js                  # Frontend table sorting, filtering, and exports
│   └── style.css                  # Custom styling and dark mode rules
├── templates/
│   └── index.html                 # Main web page layout
├── requirements.txt               # Required Python packages
└── README.md                      # Documentation (this file)
```

---

## How to setup and run

### 1. Install dependencies
Make sure you have **Python** installed. Open your terminal and run:
```bash
pip install -r requirements.txt
```

### 2. Set up your Smarty API keys
Create a file named `.env` in the project root folder (next to main.py) and paste your Smarty API credentials:
```env
SMARTY_AUTH_ID=your_smarty_id_here
SMARTY_AUTH_TOKEN=your_smarty_token_here
```
*(You can sign up for a free developer trial account on Smarty's website to get these keys).*

### 3. Start the application
Run the uvicorn development server:
```bash
uvicorn app.main:app --reload
```
Open your web browser and go to: **`http://localhost:8000`**

---

## Testing with sample files

You can test the app using the sample files included in the project:
1.  **`test.txt`**: A simple text file with 3 addresses to check basic geocoding.
2.  **`test_docx.docx`**: A Word file with addresses hidden in headers, footers, paragraphs, and tables.
3.  **`1000_addresses.txt`**: A large file with 1,000 addresses to test chunking, simulation fallback mode, pagination, and Excel exporting.

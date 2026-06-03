from app.validators.file_validator import FileValidator
from app.loaders.document_loader import DocumentLoader
from app.clients.smarty_client import SmartyClient

from app.exceptions.custom_exceptions import (
    TextLimitExceededException
)


class AddressService:

    def __init__(self):
        self.file_validator = FileValidator()
        self.document_loader = DocumentLoader()
        self.smarty_client = SmartyClient()

    def parse_unverified_components(self, text):
        import re
        components = {
            "primary_number": "",
            "street_name": "",
            "street_suffix": "",
            "city_name": "",
            "state_abbreviation": "",
            "zipcode": ""
        }
        if not text:
            return components

        # Clean and split into lines
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if len(lines) >= 2:
            # Line 1: e.g. "1 Cedar Lane"
            line1 = lines[0]
            num_match = re.match(r'^(\d+)\s+(.*)', line1)
            if num_match:
                components["primary_number"] = num_match.group(1)
                street_part = num_match.group(2)
                words = street_part.split()
                if len(words) > 1:
                    components["street_suffix"] = words[-1]
                    components["street_name"] = " ".join(words[:-1])
                else:
                    components["street_name"] = street_part
            else:
                components["street_name"] = line1

            # Line 2: e.g. "Los Angeles, CA 90001"
            line2 = lines[1]
            parts = line2.split(",")
            if len(parts) >= 2:
                components["city_name"] = parts[0].strip()
                state_zip = parts[1].strip()
            else:
                state_zip = line2

            sz_match = re.search(r'\b([A-Z]{2})\b\s+(\d{5})', state_zip, re.IGNORECASE)
            if sz_match:
                components["state_abbreviation"] = sz_match.group(1).upper()
                components["zipcode"] = sz_match.group(2)
            else:
                words = state_zip.split()
                if len(words) >= 2:
                    components["zipcode"] = words[-1]
                    components["state_abbreviation"] = words[-2].upper()
                    if len(parts) < 2:
                        components["city_name"] = " ".join(words[:-2])
                elif len(words) == 1:
                    if words[0].isdigit():
                        components["zipcode"] = words[0]
                    else:
                        components["state_abbreviation"] = words[0].upper()
        else:
            # Single line address
            text_clean = text.replace("\n", " ").strip()
            parts = text_clean.split(",")
            if len(parts) >= 3:
                street_part = parts[0].strip()
                num_match = re.match(r'^(\d+)\s+(.*)', street_part)
                if num_match:
                    components["primary_number"] = num_match.group(1)
                    s_words = num_match.group(2).split()
                    if len(s_words) > 1:
                        components["street_suffix"] = s_words[-1]
                        components["street_name"] = " ".join(s_words[:-1])
                    else:
                        components["street_name"] = num_match.group(2)
                
                components["city_name"] = parts[1].strip()
                state_zip = parts[2].strip()
                sz_match = re.search(r'\b([A-Z]{2})\b\s+(\d{5})', state_zip, re.IGNORECASE)
                if sz_match:
                    components["state_abbreviation"] = sz_match.group(1).upper()
                    components["zipcode"] = sz_match.group(2)
            else:
                components["street_name"] = text_clean
        return components

    def format_addresses(self, addresses):

        formatted_addresses = []

        for address in addresses:
            import re
            verified = address.get("verified", False)
            api_output = address.get("api_output", [])

            if verified and api_output:
                candidate = api_output[0]
                components = candidate.get("components", {})
            else:
                components = self.parse_unverified_components(address.get("text", ""))

            source_str = address.get("source", "Unknown")
            page_match = re.search(r'Page\s+(\d+)', source_str, re.IGNORECASE)
            page_number = int(page_match.group(1)) if page_match else 1

            formatted_addresses.append({
                "input_text": address.get("text", ""),
                "components": components,
                "verified": verified,
                "source": source_str,
                "page_number": page_number
            })

        # Deduplicate and merge sources
        addr_map = {}
        for addr in formatted_addresses:
            comps = addr["components"]
            key = (
                comps.get("primary_number", "").strip().lower(),
                comps.get("street_name", "").strip().lower(),
                comps.get("street_suffix", "").strip().lower(),
                comps.get("city_name", "").strip().lower(),
                comps.get("state_abbreviation", "").strip().lower(),
                comps.get("zipcode", "").strip().lower(),
            )
            if key not in addr_map:
                addr_map[key] = addr
            else:
                existing_sources = [s.strip() for s in addr_map[key]["source"].split(",")]
                new_source = addr["source"]
                if new_source not in existing_sources:
                    addr_map[key]["source"] += f", {new_source}"
                if "page_number" in addr:
                    addr_map[key]["page_number"] = min(addr_map[key].get("page_number", 9999), addr["page_number"])

        return list(addr_map.values())

    def simulate_smarty_extraction(self, text: str):
        import re
        addresses = []
        
        # State abbreviations list to verify simulated addresses
        state_abbrs = r'(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)'
        state_zip_re = re.compile(r'\b' + state_abbrs + r'\b\s+\d{5}(?:-\d{4})?\b')
        
        # Address block extractor regex (Street/PO Box + optional City + optional State + ZIP)
        ADDRESS_BLOCK_RE = re.compile(
            r'(?:'
            r'(?:\b\d+\s+(?:[A-Za-z0-9\.\s#,]{1,30}\s+)?(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Parkway|Pkwy|Circle|Cir|Trail|Trl|Highway|Hwy|Loop|Plaza|Pl|Terrace|Ter|Square|Sq|Broadway)\b)|'
            r'(?:\bP\.?\s*O\.?\s*Box\s+\d+\b)'
            r')'
            r'(?:[\s,]+[A-Za-z\s\.\-]{2,30})?'  # Optional City
            r'(?:[\s,]+\b' + state_abbrs + r'\b\s+\d{5}(?:-\d{4})?\b)?',
            re.IGNORECASE
        )

        for match in ADDRESS_BLOCK_RE.finditer(text):
            addr_text = match.group(0).strip()
            if addr_text.endswith('.'):
                addr_text = addr_text[:-1].strip()
            
            # Require uppercase state abbreviation to keep candidate (prevents lowercase word matches like "in", "or")
            if not re.search(r'\b' + state_abbrs + r'\b', addr_text):
                continue

            # Verify only if it has a state and zip code structure to prevent false positives in offer letters
            is_verified = bool(state_zip_re.search(addr_text))
            
            # For simulation fallback, to prevent false positives (like "1000 Square feet"),
            # we only extract/return if it has a valid State and ZIP code structure.
            if not is_verified:
                continue

            comps = self.parse_unverified_components(addr_text)
            start_pos = match.start()
            end_pos = match.start() + len(addr_text)
            
            addresses.append({
                "text": addr_text,
                "verified": is_verified,
                "start": start_pos,
                "end": end_pos,
                "api_output": [{
                    "components": comps
                }] if is_verified else []
            })
        return {"addresses": addresses}

    def _get_addresses_with_fallback(self, chunk_text):
        from app.exceptions.custom_exceptions import (
            AuthenticationException,
            QuotaExceededException,
            NetworkException
        )
        try:
            response = self.smarty_client.extract_addresses(chunk_text)
            return response, False
        except (QuotaExceededException, AuthenticationException, NetworkException) as e:
            print(f"Smarty API error: {str(e)}. Running in local simulation mode.")
            response = self.simulate_smarty_extraction(chunk_text)
            return response, True

    async def process_document(self, file):
        import re
        import time

        start_time = time.perf_counter()
        self.simulation_mode = False

        # Step 1: Validate uploaded file
        await self.file_validator.validate_file(file)

        # Step 2: Select appropriate processor
        processor = self.document_loader.load_file(file)

        # Step 3: Extract segments
        segments = processor.extract_segments(file)

        # Regex for US Address Detection (strictly requiring state+zip or street + suffix keyword)
        US_ADDRESS_RE = re.compile(
            r'(?:\b(?:AL|AK|AS|AZ|AR|CA|CO|CT|DE|DC|FM|FL|GA|GU|HI|ID|IL|IN|IA|KS|KY|LA|ME|MH|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|MP|OH|OK|OR|PW|PA|PR|RI|SC|SD|TN|TX|UT|VT|VI|VA|WA|WV|WI|WY)\b\s+\d{5}(?:-\d{4})?\b)|'  # State + Zip (uppercase, strict ZIP boundary)
            r'(?i:\b\d+\s+(?:[A-Za-z0-9\.\s#,]{1,20}\s+)?(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Parkway|Pkwy|Circle|Cir|Trail|Trl|Highway|Hwy|Loop|Plaza|Pl|Terrace|Ter|Square|Sq|Broadway)\b)'  # Street + suffix keyword (case-insensitive)
        )

        # Step 4: Filter segments using regex and deduplicate identical text blocks
        matched_segments = []
        for seg in segments:
            if US_ADDRESS_RE.search(seg["text"]):
                matched_segments.append(seg)

        unique_segments = []
        text_to_sources = {}
        for seg in matched_segments:
            normalized_text = " ".join(seg["text"].lower().split())
            if normalized_text not in text_to_sources:
                text_to_sources[normalized_text] = [seg["source"]]
                unique_segments.append(seg)
            else:
                if seg["source"] not in text_to_sources[normalized_text]:
                    text_to_sources[normalized_text].append(seg["source"])

        # Calculate total text size of the unique segments to determine chunking
        unique_text = "\n\n".join([seg["text"] for seg in unique_segments])
        unique_text_size = len(unique_text.encode("utf-8"))

        all_extracted_addresses = []
        total_chunks = 0
        chunks_sent = 0

        # Define source type for stats
        filename = file.filename.lower()
        if filename.endswith(".pdf"):
            import io
            import pypdf
            await file.seek(0)
            pdf_bytes = await file.read()
            pdf_stream = io.BytesIO(pdf_bytes)
            reader = pypdf.PdfReader(pdf_stream)
            total_pages = len(reader.pages)
            await file.seek(0)
        elif filename.endswith(".docx"):
            import io
            from docx import Document
            await file.seek(0)
            doc_bytes = await file.read()
            doc_stream = io.BytesIO(doc_bytes)
            doc = Document(doc_stream)
            total_pages = len(doc.sections)
            await file.seek(0)
        else:
            total_pages = 1

        if unique_text_size <= 50 * 1024:
            total_chunks = 1
            if unique_segments:
                chunks_sent = 1
                chunk_text = "\n\n".join([seg["text"] for seg in unique_segments])
                
                # Send to Smarty API with simulation fallback
                response, sim_active = self._get_addresses_with_fallback(chunk_text)
                if sim_active:
                    self.simulation_mode = True
                
                # Build offset ranges for mapping
                offsets = []
                current_pos = 0
                for seg in unique_segments:
                    start_off = current_pos
                    end_off = current_pos + len(seg["text"])
                    offsets.append({
                        "start": start_off,
                        "end": end_off,
                        "normalized_text": " ".join(seg["text"].lower().split())
                    })
                    current_pos = end_off + 2 # +2 for "\n\n"

                # Parse and map addresses
                for addr in response.get("addresses", []):
                    addr_start = addr.get("start", 0)
                    addr_sources = []
                    for off in offsets:
                        if off["start"] <= addr_start < off["end"]:
                            addr_sources = text_to_sources[off["normalized_text"]]
                            break
                    addr["source"] = ", ".join(addr_sources) if addr_sources else "Unknown"
                    all_extracted_addresses.append(addr)
            else:
                chunks_sent = 0
        else:
            # Over 1MB logic: Group unique_segments into chunks under 1MB
            raw_chunks = []
            current_chunk = []
            current_chunk_size = 0
            
            for seg in unique_segments:
                seg_size = len(seg["text"].encode("utf-8"))
                if current_chunk_size + seg_size + 2 > 50 * 1024:
                    if current_chunk:
                        raw_chunks.append(current_chunk)
                    current_chunk = [seg]
                    current_chunk_size = seg_size
                else:
                    current_chunk.append(seg)
                    current_chunk_size += seg_size + 2
            if current_chunk:
                raw_chunks.append(current_chunk)
            
            total_chunks = len(raw_chunks)
            chunks_sent = total_chunks
            
            for chunk_segments in raw_chunks:
                chunk_text = "\n\n".join([seg["text"] for seg in chunk_segments])
                
                # Send to Smarty API with simulation fallback
                response, sim_active = self._get_addresses_with_fallback(chunk_text)
                if sim_active:
                    self.simulation_mode = True
                
                # Build offset ranges for mapping
                offsets = []
                current_pos = 0
                for seg in chunk_segments:
                    start_off = current_pos
                    end_off = current_pos + len(seg["text"])
                    offsets.append({
                        "start": start_off,
                        "end": end_off,
                        "normalized_text": " ".join(seg["text"].lower().split())
                    })
                    current_pos = end_off + 2 # +2 for "\n\n"

                # Parse and map addresses
                for addr in response.get("addresses", []):
                    addr_start = addr.get("start", 0)
                    addr_sources = []
                    for off in offsets:
                        if off["start"] <= addr_start < off["end"]:
                            addr_sources = text_to_sources[off["normalized_text"]]
                            break
                    addr["source"] = ", ".join(addr_sources) if addr_sources else "Unknown"
                    all_extracted_addresses.append(addr)

        # Merge, format and deduplicate addresses
        formatted_addresses = self.format_addresses(all_extracted_addresses)

        processing_time = time.perf_counter() - start_time

        return {
            "addresses": formatted_addresses,
            "simulation_mode": self.simulation_mode,
            "stats": {
                "total_pages": total_pages,
                "total_chunks": total_chunks,
                "chunks_sent": chunks_sent,
                "addresses_extracted": len(formatted_addresses),
                "processing_time": round(processing_time, 2)
            }
        }
    
from app.exceptions.custom_exceptions import (
    AuthenticationException,
    QuotaExceededException,
    NetworkException,
    InvalidAPIResponseException
)
import os
import requests

from dotenv import load_dotenv 
class SmartyClient:

    def __init__(self):

        load_dotenv()

        self.auth_id = os.getenv("SMARTY_AUTH_ID")
        self.auth_token = os.getenv("SMARTY_AUTH_TOKEN")

        self.base_url = "https://us-extract.api.smarty.com/"

    def extract_addresses(self, text: str):
        import time

        params = {
            "auth-id": self.auth_id,
            "auth-token": self.auth_token
        }

        headers = {
            "Content-Type": "text/plain; charset=utf-8"
        }

        max_retries = 3
        backoff = 1.0

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.base_url,
                    params=params,
                    data=text.encode("utf-8"),
                    headers=headers,
                    timeout=30
                )

                # Handle Rate Limiting
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    sleep_time = float(retry_after) if retry_after else backoff
                    print(f"Rate limited (429). Retrying in {sleep_time}s (Attempt {attempt+1}/{max_retries})...")
                    time.sleep(sleep_time)
                    backoff *= 2
                    continue

                if response.status_code == 401:
                    raise AuthenticationException("Authentication required.")

                if response.status_code == 402:
                    raise QuotaExceededException("Address extraction service is temporarily unavailable.")

                response.raise_for_status()

                data = response.json()
                if "addresses" not in data:
                    raise InvalidAPIResponseException("Invalid API response received.")

                print(f"Successfully extracted {len(data.get('addresses', []))} address candidates.")
                return data

            except requests.Timeout:
                if attempt == max_retries - 1:
                    raise NetworkException("Request timed out while connecting to Smarty API.")
                time.sleep(backoff)
                backoff *= 2

            except requests.ConnectionError:
                if attempt == max_retries - 1:
                    raise NetworkException("Unable to connect to Smarty API.")
                time.sleep(backoff)
                backoff *= 2

            except ValueError:
                raise InvalidAPIResponseException("Invalid JSON response received.")
        
        # If all retries fail with 429
        raise NetworkException("Failed to complete request after multiple rate-limit retries.")
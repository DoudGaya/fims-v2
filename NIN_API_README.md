# FIMS NIN Validation API Documentation

> **CCSA Farmer Information Management System (FIMS)**  
> Service Endpoint Documentation for Internal Office & Inter-Department Integration

This document outlines the API endpoint provided by FIMS to validate Nigerian National Identification Numbers (NIN) and retrieve verified citizen data (demographics, residence, contact info, and biometric photograph). This endpoint uses the exact same data source and response structure used by the **`ccsa-mobile`** application.

---

## 📌 Endpoint Overview

| Property | Value |
| :--- | :--- |
| **Production Base URL** | `https://fims.cosmopolitan.edu.ng` |
| **Primary Endpoint** | `/api/nin/lookup` |
| **Alternative Endpoint** | `/api/nin/verify` *(standardized camelCase format)* |
| **Supported Methods** | `GET`, `POST` |
| **Content-Type** | `application/json` |
| **Authentication** | `X-API-Key: fims_live_...` or `Authorization: Bearer <token>` |
| **Required Scope** | `nin:verify` |

---

## 🔑 Authentication & Access Control

To access this API:
1. Contact the FIMS Administrator to request an API key with the **`nin:verify`** scope.
2. The administrator configures your rate limit (e.g. 30 requests/min) and monthly quota at `https://fims.cosmopolitan.edu.ng/api-keys`.
3. Include your API token in all requests via either:
   - Header: `X-API-Key: fims_live_YOUR_TOKEN`
   - Header: `Authorization: Bearer fims_live_YOUR_TOKEN`
*(Mobile agents can pass their Firebase Agent Bearer token).*

---

## 🚀 Quick Reference

- **GET (cURL):**
  ```bash
  curl -X GET "https://fims.cosmopolitan.edu.ng/api/nin/lookup?nin=12345678901" \
    -H "X-API-Key: fims_live_YOUR_TOKEN"
  ```
- **POST (cURL):**
  ```bash
  curl -X POST "https://fims.cosmopolitan.edu.ng/api/nin/lookup" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: fims_live_YOUR_TOKEN" \
    -d '{"nin": "12345678901"}'
  ```

---

## 1. Primary Endpoint: `/api/nin/lookup`

This is the exact endpoint called by `ccsa-mobile` ([ninService.js](file:///c:/projects/ccsa-deploy/ccsa-mobile/src/services/ninService.js#L225)). It connects to the upstream identity verification provider (NIMC level-4 KYC) and returns the citizen record.

### Request

#### A. GET Request (Query Parameter)
```http
GET /api/nin/lookup?nin=12345678901 HTTP/1.1
Host: fims.cosmopolitan.edu.ng
Accept: application/json
```

#### B. POST Request (JSON Body)
```http
POST /api/nin/lookup HTTP/1.1
Host: fims.cosmopolitan.edu.ng
Content-Type: application/json

{
  "nin": "12345678901"
}
```

### Parameters

| Field | Type | Placement | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `nin` | `string` | Query (`?nin=`) or Body (`{"nin": "..."}`) | **Yes** | 11-digit Nigerian National Identity Number |

---

### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "nin": "12345678901",
    "firstname": "FATIMA",
    "surname": "BELLO",
    "middlename": "AMINU",
    "dateofbirth": "1994-08-21",
    "gender": "female",
    "telephoneno": "08012345678",
    "msisdn": "08012345678",
    "email": "fatima.bello@example.com",
    "birthstate": "Kano",
    "birthlga": "Nassarawa",
    "residence_state": "Kano",
    "residence_lga": "Dala",
    "residence_address": "No 14 Bompai Road",
    "residence-address1": "No 14 Bompai Road",
    "emplymentstatus": "Employed",
    "educationallevel": "Tertiary",
    "maritalstatus": "Married",
    "photo": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQY...",
    "signature": "iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

#### Key Fields Description:
- **`photo`**: Base64-encoded JPEG image string. Can be embedded directly into HTML: `<img src="data:image/jpeg;base64,{photo}" />`.
- **`signature`**: Base64-encoded image string of the holder's signature.
- **`telephoneno` / `msisdn`**: Mobile number linked to the NIN profile.
- **`birthstate` / `birthlga`**: State and Local Government of origin.
- **`residence_state` / `residence_lga`**: State and Local Government of current residence.

---

## 2. Recommended Client-Side Mapping (as in `ccsa-mobile`)

In `ccsa-mobile`, incoming raw NIN data is normalized into standard application fields. Other departments can replicate this pattern:

```javascript
function mapNINResponse(apiResult, requestedNin) {
  const d = apiResult.data;
  return {
    nin: requestedNin,
    firstName: d.firstname || '',
    middleName: d.middlename || '',
    lastName: d.surname || '',
    dateOfBirth: d.dateofbirth || '',
    gender: (d.gender || '').toUpperCase(),
    phone: d.telephoneno || d.msisdn || '',
    email: d.email || '',
    stateOfOrigin: d.birthstate || '',
    lgaOfOrigin: d.birthlga || '',
    residenceState: d.residence_state || '',
    residenceLga: d.residence_lga || '',
    residenceAddress: d.residence_address || d['residence-address1'] || '',
    maritalStatus: d.maritalstatus || '',
    employmentStatus: d.emplymentstatus || '',
    photoBase64: d.photo || null
  };
}
```

---

## 3. Alternative Formatted Endpoint: `/api/nin/verify`

If your department prefers an endpoint that already normalizes keys to `camelCase` and provides an explicit `isValid: true` flag, you can use `/api/nin/verify`.

- **Method:** `GET /api/nin/verify?nin=12345678901` or `POST /api/nin/verify`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "firstName": "FATIMA",
    "middleName": "AMINU",
    "lastName": "BELLO",
    "dateOfBirth": "1994-08-21",
    "gender": "FEMALE",
    "maritalStatus": "Married",
    "phone": "08012345678",
    "email": "fatima.bello@example.com",
    "photo": "/9j/4AAQSkZJRg...",
    "title": null,
    "religion": null,
    "profession": null,
    "educationlevel": "Tertiary",
    "nin": "12345678901"
  }
}
```

---

## 4. Integration Code Examples

### cURL

```bash
# Using GET with X-API-Key
curl -X GET "https://fims.cosmopolitan.edu.ng/api/nin/lookup?nin=12345678901" \
  -H "X-API-Key: fims_live_YOUR_TOKEN"

# Using POST with JSON body and Bearer token
curl -X POST "https://fims.cosmopolitan.edu.ng/api/nin/lookup" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fims_live_YOUR_TOKEN" \
  -d '{"nin": "12345678901"}'
```

### JavaScript / TypeScript (Node.js / Browser)

```javascript
const FIMS_API_KEY = 'fims_live_YOUR_TOKEN';

async function fetchNINData(nin) {
  try {
    const response = await fetch(`https://fims.cosmopolitan.edu.ng/api/nin/lookup?nin=${encodeURIComponent(nin)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': FIMS_API_KEY,
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || result.error || `HTTP ${response.status}`);
    }

    return result.data;
  } catch (error) {
    console.error('NIN Lookup Failed:', error.message);
    throw error;
  }
}

// Example Execution
fetchNINData('12345678901')
  .then(data => console.log('Citizen:', data.firstname, data.surname))
  .catch(err => console.error(err));
```

### Python (3.x)

```python
import requests

FIMS_API_KEY = "fims_live_YOUR_TOKEN"

def lookup_nin(nin: str):
    url = "https://fims.cosmopolitan.edu.ng/api/nin/lookup"
    params = {"nin": nin}
    headers = {
        "X-API-Key": FIMS_API_KEY,
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=20)
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            return data["data"]
        else:
            msg = data.get("message") or data.get("error") or "Lookup failed"
            raise Exception(f"Status {response.status_code}: {msg}")
            
    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error during NIN lookup: {str(e)}")

# Example Execution
if __name__ == "__main__":
    try:
        citizen = lookup_nin("12345678901")
        print(f"Name: {citizen.get('firstname')} {citizen.get('surname')}")
        print(f"DOB: {citizen.get('dateofbirth')}")
        print(f"State: {citizen.get('birthstate')}")
    except Exception as e:
        print(f"Error: {e}")
```

### PHP

```php
<?php
$fimsApiKey = "fims_live_YOUR_TOKEN";

function lookupNIN($nin, $apiKey) {
    $url = "https://fims.cosmopolitan.edu.ng/api/nin/lookup?nin=" . urlencode($nin);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'X-API-Key: ' . $apiKey
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $result = json_decode($response, true);
    
    if ($httpCode === 200 && !empty($result['success'])) {
        return $result['data'];
    }
    
    $error = $result['message'] ?? $result['error'] ?? "NIN lookup error";
    throw new Exception("HTTP $httpCode: $error");
}

// Example Execution
try {
    $citizen = lookupNIN("12345678901", $fimsApiKey);
    echo "Citizen: " . $citizen['firstname'] . " " . $citizen['surname'];
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
```

---

## 5. Error Responses & Status Codes

| HTTP Status | Reason | Payload Example |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Missing or malformed NIN / invalid JSON | `{"error": "NIN is required"}` |
| **`401 Unauthorized`** | Missing, revoked, expired, or invalid API key | `{"error": "Unauthorized", "message": "Access to the NIN Validation API requires an authorized API Key (X-API-Key: fims_live_...)"}` |
| **`403 Forbidden`** | Key lacks the required `nin:verify` scope | `{"error": "Forbidden", "message": "Your API key does not have the 'nin:verify' scope required for this endpoint."}` |
| **`404 Not Found`** | NIN does not exist in the NIMC database | `{"success": false, "error": "NIN not found", "message": "NIN not found", "code": "NIN_NOT_FOUND"}` |
| **`429 Too Many Requests`** | API key rate limit or provider rate limit exceeded | `{"error": "Too Many Requests", "message": "Rate limit of 30 requests/minute exceeded. Please slow down."}` |
| **`502 Bad Gateway`** | Upstream provider credentials or rejection | `{"success": false, "error": "NIN service authentication failed", "code": "AUTH_FAILED"}` |
| **`503 Service Unavailable`** | Provider account suspended / not configured | `{"error": "NIN verification service unavailable"}` |

---

## 6. Server Environment Configuration (Reference)

For administrators deploying or running FIMS locally/staging, the following environment variables in `.env` govern this service:

```env
NIN_API_BASE_URL=https://upstream-provider-url/api
NIN_API_KEY=your_upstream_api_key
NIN_API_REQUEST_REASON=KYC_VERIFICATION
NIN_ALLOW_INSECURE_TLS_FALLBACK=true
```
*(In development mode, if the API key is not configured, the endpoint returns mock test citizen data).*

---

## 7. FIMS Source Code References

- **Lookup Route:** [fims-v2/app/api/nin/lookup/route.ts](file:///c:/projects/ccsa-deploy/fims-v2/app/api/nin/lookup/route.ts)
- **Verify Route:** [fims-v2/app/api/nin/verify/route.ts](file:///c:/projects/ccsa-deploy/fims-v2/app/api/nin/verify/route.ts)
- **Provider Core Logic:** [fims-v2/lib/ninProvider.ts](file:///c:/projects/ccsa-deploy/fims-v2/lib/ninProvider.ts)
- **Mobile Client Service:** [ccsa-mobile/src/services/ninService.js](file:///c:/projects/ccsa-deploy/ccsa-mobile/src/services/ninService.js)

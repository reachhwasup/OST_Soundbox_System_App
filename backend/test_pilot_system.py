import sys
import time
import urllib.request
import urllib.error
import json

BASE_URL = "http://localhost:8000"

def log_test(title, passed, details=""):
    badge = "✅ PASS" if passed else "❌ FAIL"
    print(f"[{badge}] {title}")
    if details:
        print(f"       -> {details}")
    if not passed:
        sys.exit(1)

def make_req(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            try:
                parsed = json.loads(content)
            except Exception:
                parsed = content
            return status, parsed
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = content
        return e.code, parsed
    except Exception as e:
        return 500, str(e)

def main():
    print("\n=======================================================")
    print("🚀 OST SOUNDBOX SYSTEM - COMPREHENSIVE PILOT TEST SUITE")
    print("=======================================================\n")

    # 1. Health & Documentation Check
    status, res = make_req("GET", "/health")
    log_test("System Health Check (/health)", status == 200, f"Payload: {res}")

    # 2. Admin Authentication
    status, res = make_req("POST", "/api/auth/login", {
        "phone_number": "012345678",
        "password": "Admin123!"
    })
    log_test("Admin Authentication (012345678)", status == 200)
    admin_token = res.get("access_token")

    # 3. Dynamic Merchant Registration
    ts = int(time.time())
    merchant_phone = f"088{ts % 1000000:06d}"
    merchant_name = f"Pilot Merchant {ts}"
    status, res = make_req("POST", "/api/auth/register", {
        "phone_number": merchant_phone,
        "password": "Password123!",
        "full_name": merchant_name
    })
    log_test(f"Merchant Self-Registration ({merchant_phone})", status in [200, 201])
    merchant_token = res.get("access_token")

    # Verify merchant profile
    status, res = make_req("GET", "/api/auth/me", token=merchant_token)
    me_user = res.get("user", {})
    log_test("Merchant /api/auth/me Verification", status == 200 and me_user.get("phone_number") == merchant_phone)

    # 4. Merchant Store Creation with Cambodia Administrative Hierarchy
    store_payload = {
        "name": f"Brown Cafe Pilot #{ts % 1000}",
        "place": "Phsar Kandal Market",
        "location": "Corner of St 130 & St 13, Phum 1, Phsar Kandal 1, Doun Penh, Phnom Penh",
        "province": "Phnom Penh",
        "district": "Doun Penh",
        "commune": "Phsar Kandal 1",
        "village": "Phum 1",
        "street": "Street 130 #15"
    }
    status, res = make_req("POST", "/api/stores/register", store_payload, token=merchant_token)
    store_id = res.get("store_id") or res.get("store", {}).get("id")
    log_test("Merchant Store Registration with Cambodia Gazetteer Hierarchy", status in [200, 201] and bool(store_id), f"Store: {res.get('store', {}).get('name')}")

    # Verify Merchant Stores
    status, res = make_req("GET", "/api/stores/my-stores", token=merchant_token)
    my_stores = res.get("stores", [])
    log_test("Merchant Stores Retrieval (/api/stores/my-stores)", any(s.get("id") == store_id for s in my_stores), f"Store ID #{store_id} verified")

    # 5. Admin Hardware Intake into Warehouse Stock
    test_sn = f"SN-PILOT-{ts % 10000:04d}"
    intake_payload = {
        "serial_numbers": [test_sn],
        "device_model": "Standard Soundbox",
        "batch_no": f"BATCH-Q3-{ts // 86400}",
        "price": 29.00,
        "notes": "Automated pilot warehouse test hardware"
    }
    status, res = make_req("POST", "/api/devices/bulk-import", intake_payload, token=admin_token)
    log_test(f"Admin Hardware Stock Intake ({test_sn})", status in [200, 201], f"Imported: {res.get('imported_count', 1)}")

    # 6. Merchant Claims & Links Soundbox to Store
    link_payload = {
        "device_sn": test_sn,
        "merchant_id": store_id,
        "device_type": "Standard Soundbox",
        "price": 29.00
    }
    status, res = make_req("POST", "/api/devices/register", link_payload, token=merchant_token)
    if isinstance(res, str):
        print(f"DEBUG: /api/devices/register status: {status}, body: {res}")
    device_id = res.get("device_id") if isinstance(res, dict) else None
    log_test(f"Merchant Link Soundbox ({test_sn} -> Store #{store_id})", status in [200, 201] and bool(device_id), f"Device ID: {device_id}")

    # 7. Device Command: Remote Voice Test & Volume Adjustment
    cmd_payload = {
        "command_type": "TEST_SOUND",
        "volume": 85,
        "text": "OST Soundbox Pilot Broadcast OK"
    }
    status, res = make_req("POST", f"/api/devices/{device_id}/command", cmd_payload, token=merchant_token)
    log_test(f"Remote Device Voice Test & Volume Command (Device #{device_id})", status == 200, f"Status: {res.get('status')}")

    # 8. Device Command: Remote Reboot
    reboot_payload = {
        "command_type": "REBOOT"
    }
    status, res = make_req("POST", f"/api/devices/{device_id}/command", reboot_payload, token=merchant_token)
    log_test(f"Remote Device Reboot Command (Device #{device_id})", status == 200, f"Status: {res.get('status')}")

    # 9. Admin Overview Stats & Analytics
    status, res = make_req("GET", "/api/admin/stats", token=admin_token)
    log_test("Admin Analytics & KPI Aggregates (/api/admin/stats)", status == 200, f"Stats: {res.get('stats', res)}")

    # 10. Admin Store & Merchant Registry Queries
    status, res = make_req("GET", "/api/admin/stores", token=admin_token)
    log_test("Admin Store Registry Retrieval (/api/admin/stores)", status == 200, f"Total stores: {len(res.get('stores', []))}")

    # 11. Admin User Management Queries
    status, res = make_req("GET", "/api/admin/users", token=admin_token)
    log_test("Admin User Management Registry (/api/admin/users)", status == 200, f"Total users: {len(res.get('users', []))}")

    # 12. Admin Activity Audit Logs
    status, res = make_req("GET", "/api/admin/logs", token=admin_token)
    log_test("Admin Activity Audit Trail (/api/admin/logs)", status == 200, f"Total logs: {len(res.get('logs', []))}")

    # 13. Device Return to Stock / Maintenance / Unlink Flow
    status, res = make_req("POST", f"/api/devices/{device_id}/unlink", token=merchant_token)
    log_test(f"Merchant Soundbox Unlink ({test_sn})", status == 200, f"Status: {res.get('status')}")

    print("\n=======================================================")
    print("🎉 ALL 13 PILOT TEST SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=======================================================\n")

if __name__ == "__main__":
    main()

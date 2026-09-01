import asyncio
import os
import random
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import asyncpg
from backend.security import hash_password

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:fDdiFw_KB2930otN@ost_postgres:5432/postgres")

async def seed_data():
    print(f"Connecting to database at {DATABASE_URL}...")
    conn = await asyncpg.connect(DATABASE_URL)
    print("Connected successfully. Starting comprehensive demo data seeding...\n")

    default_pw = hash_password("password123")
    admin_pw = hash_password("Admin123!")

    # 1. Seed Users
    users_data = [
        ("012345678", "System Administrator", admin_pw, "ADMIN", "ACTIVE"),
        ("098765432", "Sok San (Brown Coffee)", default_pw, "USER", "ACTIVE"),
        ("012999888", "Chea Vanna (Amazon Cafe)", default_pw, "USER", "ACTIVE"),
        ("077112233", "Heng Dara (Lucky Mart)", default_pw, "USER", "ACTIVE"),
        ("088554433", "Ly Sreyneath (Bayon Bakery)", default_pw, "USER", "ACTIVE"),
        ("096332211", "Chan Piseth (PP Mart)", default_pw, "USER", "ACTIVE"),
        ("070889900", "Keo Pich (Smart Phone)", default_pw, "USER", "SUSPENDED"),
        ("015443322", "Mao Sovann (Angkor Souvenir)", default_pw, "USER", "ACTIVE"),
        ("089776655", "Touch Chanty (Phnom Penh Electronics)", default_pw, "USER", "ACTIVE"),
        ("093221144", "Rath Vicheka (Battambang Coffee)", default_pw, "USER", "ACTIVE"),
    ]

    user_ids = {}
    print("--- 1. Seeding Users ---")
    for phone, name, pw, role, status in users_data:
        row = await conn.fetchrow("""
            INSERT INTO users (phone_number, full_name, password_hash, role, status)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (phone_number) DO UPDATE
            SET full_name = $2, role = $4, status = $5
            RETURNING id, phone_number
        """, phone, name, pw, role, status)
        user_ids[phone] = row["id"]
        print(f"  ✓ User {name} ({phone}) -> ID: {row['id']}")

    # 2. Seed Merchants / Stores
    merchants_data = [
        ("Brown Coffee BKK1", "098765432", user_ids["098765432"], "Phnom Penh", "Chamkar Mon", "Boeng Keng Kang 1", "Phum 3", "St 51 corner St 302"),
        ("Amazon Cafe Riverside", "012999888", user_ids["012999888"], "Phnom Penh", "Daun Penh", "Chey Chumneah", "Phum 1", "Sisowath Quay"),
        ("Lucky Supermarket Toul Kork", "077112233", user_ids["077112233"], "Phnom Penh", "Tuol Kouk", "Boeng Kak 2", "Phum 5", "St 315"),
        ("Bayon Bakery Siem Reap", "088554433", user_ids["088554433"], "Siem Reap", "Siem Reap", "Svay Dangkum", "Mondul 1", "Sivutha Blvd"),
        ("Phnom Penh Mart 24/7", "096332211", user_ids["096332211"], "Phnom Penh", "Prampir Meakkakra", "Mittapheap", "Phum 2", "Monivong Blvd"),
        ("Smart Phone Hub", "070889900", user_ids["070889900"], "Kandal", "Ta Khmau", "Ta Khmau", "Phum Prek Samrong", "St 21"),
        ("Angkor Souvenir & Craft", "015443322", user_ids["015443322"], "Siem Reap", "Siem Reap", "Sala Kamreuk", "Wat Damnak", "Achar Sva St"),
        ("Phnom Penh Electronics", "089776655", user_ids["089776655"], "Phnom Penh", "Khan 7 Makara", "Monorom", "Phum 4", "Kampuchea Krom Blvd"),
        ("Battambang Riverside Cafe", "093221144", user_ids["093221144"], "Battambang", "Battambang", "Svay Pao", "Kamkor", "St 1"),
        ("Kampot Pepper & Coffee", "098765432", user_ids["098765432"], "Kampot", "Kampot", "Kampong Kandal", "1 Osophear", "Old Market St"),
    ]

    merchant_ids = []
    print("\n--- 2. Seeding Merchants / Stores ---")
    for sname, ophone, uid, prov, dist, comm, vill, st in merchants_data:
        existing = await conn.fetchrow("SELECT id FROM merchants WHERE name = $1", sname)
        if existing:
            m_id = existing["id"]
            await conn.execute("""
                UPDATE merchants 
                SET user_id = $2, owner_phone = $3, province = $4, district = $5, commune = $6, village = $7, street = $8, status = 'ACTIVE'
                WHERE id = $1
            """, m_id, uid, ophone, prov, dist, comm, vill, st)
        else:
            m_row = await conn.fetchrow("""
                INSERT INTO merchants (name, owner_phone, user_id, province, district, commune, village, street, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
                RETURNING id
            """, sname, ophone, uid, prov, dist, comm, vill, st)
            m_id = m_row["id"]
        merchant_ids.append(m_id)
        print(f"  ✓ Store '{sname}' ({prov}) -> ID: {m_id}")

    # 3. Seed Soundbox Devices
    now = datetime.now(timezone.utc)
    devices_data = [
        # --- A. Deployed Soundboxes in Stores ---
        ("6152608110001", "6152608110001", "Y6B", merchant_ids[0], "-1001234567890", "ACTIVE", "100%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q1", "Installed at counter 1", 29.00, now - timedelta(minutes=2)),
        ("6152608110002", "6152608110002", "Y6B", merchant_ids[1], "-1001987654321", "ACTIVE", "95%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q1", "Installed at main register", 29.00, now - timedelta(minutes=8)),
        ("6152608110003", "6152608110003", "Y6B", merchant_ids[2], "-1001555444333", "ACTIVE", "88%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q1", "Cashier station 2", 29.00, now - timedelta(minutes=15)),
        ("6152608110004", "6152608110004", "Y6B", merchant_ids[3], "-1001777888999", "ACTIVE", "72%", "Moderate", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q2", "Bakery front counter", 29.00, now - timedelta(hours=1)),
        ("6152608110005", "6152608110005", "Y6B", merchant_ids[4], "-1001112223334", "ACTIVE", "100%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q2", "24/7 store counter", 29.00, now - timedelta(minutes=1)),
        ("6152608110006", "6152608110006", "Y6B", merchant_ids[6], "-1001999000111", "ACTIVE", "82%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q2", "Souvenir checkout desk", 29.00, now - timedelta(hours=3)),
        ("6152608110007", "6152608110007", "Y6B", merchant_ids[7], "-1001888333222", "ACTIVE", "91%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q2", "Electronics front store", 29.00, now - timedelta(minutes=12)),
        ("6152608110008", "6152608110008", "Y6B", merchant_ids[8], "-1001444555666", "ACTIVE", "64%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q2", "Coffee bar counter", 29.00, now - timedelta(hours=5)),

        # --- B. Warehouse In-Stock Units (Unassigned & Ready for Deployment) ---
        ("6152608110010", "6152608110010", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q3", "Warehouse Shelf A-01 (Tested)", 29.00, now - timedelta(days=2)),
        ("6152608110011", "6152608110011", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q3", "Warehouse Shelf A-02 (Tested)", 29.00, now - timedelta(days=2)),
        ("6152608110012", "6152608110012", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q3", "Warehouse Shelf A-03 (Tested)", 29.00, now - timedelta(days=2)),
        ("6152608110013", "6152608110013", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q3", "Warehouse Shelf A-04 (Tested)", 29.00, now - timedelta(days=2)),
        ("6152608110020", "6152608110020", "Y6_LCD", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q4", "Warehouse Shelf B-01 (Factory New)", 39.00, now - timedelta(days=1)),
        ("6152608110021", "6152608110021", "Y6_LCD", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q4", "Warehouse Shelf B-02 (Factory New)", 39.00, now - timedelta(days=1)),
        ("6152608110030", "6152608110030", "S1", None, None, "IN_STOCK", "100%", "Good", "S1_V1.2", "esp32c2x_2M_OTA", "BATCH-2026-Q4", "Warehouse Shelf C-01 (Compact Model)", 25.00, now - timedelta(hours=10)),

        # --- C. Additional Warehouse Stock Units ---
        ("6152608110090", "6152608110090", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q1", "Warehouse Shelf A-05", 29.00, now - timedelta(days=4)),
        ("6152608110091", "6152608110091", "Y6B", None, None, "IN_STOCK", "100%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", "BATCH-2026-Q1", "Warehouse Shelf A-06", 29.00, now - timedelta(days=3)),
    ]

    dev_db_map = {}
    print("\n--- 3. Seeding Soundbox Devices (Deployed & Stock) ---")
    for d_id, sn, model, mid, chat_id, st_val, batt, sig, v4g, vwifi, b_no, notes, price_val, ltime in devices_data:
        existing_dev = await conn.fetchrow("SELECT id FROM devices WHERE device_sn = $1 OR device_id = $2", sn, d_id)
        is_active = (st_val == "ACTIVE")
        if existing_dev:
            d_pk = existing_dev["id"]
            await conn.execute("""
                UPDATE devices 
                SET device_id = $2, device_sn = $3, device_model = $4, merchant_id = $5,
                    telegram_chat_id = $6, chat_id = $6, status = $7::device_status, is_active = $8,
                    battery = $9, signal = $10, version_4g = $11, version_wifi = $12,
                    batch_no = $13, notes = $14, price = $15,
                    last_online = $16, last_heartbeat = $16, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, d_pk, d_id, sn, model, mid, chat_id, st_val, is_active, batt, sig, v4g, vwifi, b_no, notes, price_val, ltime)
        else:
            dev_row = await conn.fetchrow("""
                INSERT INTO devices (device_id, device_sn, device_model, merchant_id, telegram_chat_id, chat_id,
                                    status, is_active, battery, signal, version_4g, version_wifi, batch_no, notes, price,
                                    last_online, last_heartbeat)
                VALUES ($1, $2, $3, $4, $5, $5, $6::device_status, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
                RETURNING id
            """, d_id, sn, model, mid, chat_id, st_val, is_active, batt, sig, v4g, vwifi, b_no, notes, price_val, ltime)
            d_pk = dev_row["id"]
        dev_db_map[sn] = d_pk
        print(f"  ✓ Device {sn} ({model}) [{st_val}] -> DB ID: {d_pk}")

    # 4. Seed Payment Transactions
    print("\n--- 4. Seeding Payment Transactions & Audio Broadcasts ---")
    tx_samples = [
        ("6152608110001", "ABA Bank", "TXN990123", 4.50, "USD", "Sok Channa", "Bakong KHQR - Iced Latte"),
        ("6152608110001", "Canadia Bank", "TXN990124", 18000.00, "KHR", "Kov Pisey", "Bakong KHQR - Hot Cappuccino"),
        ("6152608110002", "Acleda Bank", "TXN990125", 3.25, "USD", "Ly Sopheak", "Bakong KHQR - Green Tea Frappe"),
        ("6152608110002", "Wing Bank", "TXN990126", 25000.00, "KHR", "Chan Rithy", "Bakong KHQR - Croissant & Americano"),
        ("6152608110003", "ABA Bank", "TXN990127", 45.80, "USD", "Heng Boramey", "Bakong KHQR - Supermarket Groceries"),
        ("6152608110003", "Sathapana Bank", "TXN990128", 120000.00, "KHR", "Keo Nimol", "Bakong KHQR - Fresh Fruits & Meat"),
        ("6152608110004", "ABA Bank", "TXN990129", 12.00, "USD", "Meng Kimly", "Bakong KHQR - Birthday Cake Slice"),
        ("6152608110005", "Prince Bank", "TXN990130", 8500.00, "KHR", "Sun Vanna", "Bakong KHQR - Cold Drinks & Snacks"),
        ("6152608110006", "ABA Bank", "TXN990131", 28.00, "USD", "David Miller", "Bakong KHQR - Handcrafted Silk Scarf"),
        ("6152608110007", "ABA Bank", "TXN990132", 85.00, "USD", "Touch Panha", "Bakong KHQR - Wireless Headset Y6"),
        ("6152608110008", "Acleda Bank", "TXN990133", 14000.00, "KHR", "Pich Chenda", "Bakong KHQR - Iced Milk Coffee"),
        ("6152608110001", "ABA Bank", "TXN990134", 7.50, "USD", "Samnang Seyha", "Bakong KHQR - Double Bagel & Espresso"),
    ]

    for dev_sn, bank, b_tx, amt, cur, payer, desc in tx_samples:
        dev_id_fk = dev_db_map.get(dev_sn)
        tx_time = now - timedelta(minutes=random.randint(5, 720))
        await conn.execute("""
            INSERT INTO transactions (device_id, bank_name, bank_tx_id, amount, currency, payer_name, raw_telegram_message, status, created_at)
            VALUES ($1, $2, $3, $4, $5::currency_type, $6, $7, 'PROCESSED'::tx_status, $8)
            ON CONFLICT (bank_name, bank_tx_id) DO NOTHING
        """, dev_id_fk, bank, b_tx, amt, cur, payer, f'Received {amt} {cur} from {payer} ({desc})', tx_time)
        print(f"  ✓ Transaction {amt} {cur} on Soundbox {dev_sn} ({payer})")

    # 5. Seed Security Alerts
    print("\n--- 5. Seeding Security Alerts ---")
    alerts_data = [
        (dev_db_map["6152608110001"], merchant_ids[0], "UNAUTHORIZED_BOT_POST", "HIGH", "FakeBot", "TXN_FAKE_99", 500.00, "USD", "998877", "Unknown Scammer", "Forwarded unverified transfer message", "Sender is not a registered official bank bot"),
        (dev_db_map["6152608110003"], merchant_ids[2], "DUPLICATE_TX_ID", "WARNING", "ABA Bank", "TXN990127", 45.80, "USD", "123456789", "ABABank_Bot", "Duplicate transaction notification received", "Transaction ID TXN990127 was already broadcasted 5 minutes ago"),
        (dev_db_map["6152608110004"], merchant_ids[3], "UNVERIFIED_SENDER", "MEDIUM", "Unknown", "TXN_UNV_11", 10.00, "USD", "445566", "Suspicious User", "Direct payment slip image posted", "Message originated from standard user account instead of bank webhook"),
    ]

    for d_id, m_id, a_type, sev, b_name, b_tx, amt, cur, s_id, s_name, raw_m, reason in alerts_data:
        await conn.execute("""
            INSERT INTO security_alerts (device_id, merchant_id, alert_type, severity, bank_name, bank_tx_id, amount, currency, sender_user_id, sender_name, raw_message, reason, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """, d_id, m_id, a_type, sev, b_name, b_tx, amt, cur, s_id, s_name, raw_m, reason, now - timedelta(hours=random.randint(1, 12)))
        print(f"  ✓ Alert [{sev}] {a_type} on Device #{d_id}")

    await conn.close()
    print("\n✨ Demo data seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

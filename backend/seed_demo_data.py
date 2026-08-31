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
    print("Connected successfully. Starting demo data seeding...")

    default_pw = hash_password("password123")
    admin_pw = hash_password("Admin123!")

    # 1. Seed Users
    users_data = [
        ("012345678", "System Administrator", admin_pw, "ADMIN", "ACTIVE"),
        ("098765432", "Sok San", default_pw, "USER", "ACTIVE"),
        ("012999888", "Chea Vanna", default_pw, "USER", "ACTIVE"),
        ("077112233", "Heng Dara", default_pw, "USER", "ACTIVE"),
        ("088554433", "Ly Sreyneath", default_pw, "USER", "ACTIVE"),
        ("096332211", "Chan Piseth", default_pw, "USER", "ACTIVE"),
        ("070889900", "Keo Pich", default_pw, "USER", "SUSPENDED"),
    ]

    user_ids = {}
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
    ]

    merchant_ids = []
    for sname, ophone, uid, prov, dist, comm, vill, st in merchants_data:
        # Check existing
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
        print(f"  ✓ Store '{sname}' -> ID: {m_id}")

    # 3. Seed Soundbox Devices
    now = datetime.now(timezone.utc)
    devices_data = [
        ("6152608110006", "6152608110006", "Y6B", merchant_ids[0], "-1001234567890", "ACTIVE", "100%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(minutes=5)),
        ("6152608110005", "6152608110005", "Y6B", merchant_ids[1], "-1001987654321", "ACTIVE", "95%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(minutes=15)),
        ("6152608110004", "6152608110004", "Y6B", merchant_ids[2], "-1001555444333", "ACTIVE", "88%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(minutes=30)),
        ("6152608110003", "6152608110003", "Y6B", merchant_ids[3], "-1001777888999", "INACTIVE", "72%", "Moderate", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(hours=6)),
        ("6152608110002", "6152608110002", "Y6B", merchant_ids[4], "-1001112223334", "ACTIVE", "100%", "Excellent", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(minutes=2)),
        ("6152608110001", "6152608110001", "Y6B", merchant_ids[5], "-1001999000111", "ACTIVE", "65%", "Good", "Y6_LCD_1605_V1.0", "esp32c2x_2M_OTA", now - timedelta(hours=1)),
    ]

    device_db_ids = []
    for d_id, sn, model, mid, chat_id, status, batt, sig, v4g, vwifi, ltime in devices_data:
        existing_dev = await conn.fetchrow("SELECT id FROM devices WHERE device_sn = $1 OR device_id = $2", sn, d_id)
        if existing_dev:
            d_pk = existing_dev["id"]
            await conn.execute("""
                UPDATE devices 
                SET device_id = $2, device_sn = $3, device_model = $4, merchant_id = $5,
                    telegram_chat_id = $6, chat_id = $6, status = $7::device_status, is_active = $8,
                    battery = $9, signal = $10, version_4g = $11, version_wifi = $12,
                    last_online = $13, last_heartbeat = $13
                WHERE id = $1
            """, d_pk, d_id, sn, model, mid, chat_id, status, status == "ACTIVE", batt, sig, v4g, vwifi, ltime)
        else:
            dev_row = await conn.fetchrow("""
                INSERT INTO devices (
                    device_id, device_sn, device_model, merchant_id, 
                    telegram_chat_id, chat_id, is_active, status, 
                    battery, signal, version_4g, version_wifi, 
                    last_online, last_heartbeat
                )
                VALUES ($1, $2, $3, $4, $5, $5, $6, $7::device_status, $8, $9, $10, $11, $12, $12)
                RETURNING id
            """, d_id, sn, model, mid, chat_id, status == "ACTIVE", status, batt, sig, v4g, vwifi, ltime)
            d_pk = dev_row["id"]
        device_db_ids.append(d_pk)
        print(f"  ✓ Soundbox '{d_id}' ({model}) -> Internal ID: {d_pk}")

    # 4. Seed Transactions (User Payment Logs)
    banks = ["ABA Bank", "Bakong KHQR", "ACLEDA Bank", "Wing Bank", "Canadia Bank"]
    tx_samples = [
        ("ABA Bank", "ABA-TXN-88291049", 4.50, "USD", "KONG SOPHEA", 0),
        ("Bakong KHQR", "BK-99201840", 25000, "KHR", "MEAS VANDY", 0),
        ("ACLEDA Bank", "ACL-77291041", 12.00, "USD", "CHHORN TITH", 1),
        ("ABA Bank", "ABA-66381029", 8.25, "USD", "SOK THIDA", 1),
        ("Wing Bank", "WG-55192048", 40000, "KHR", "RATH SAROM", 2),
        ("Bakong KHQR", "BK-44182903", 65.50, "USD", "LAY SAMBATH", 2),
        ("ABA Bank", "ABA-33291044", 3.00, "USD", "PHAN BOTUM", 3),
        ("ACLEDA Bank", "ACL-22194820", 15000, "KHR", "NGET CHANNA", 3),
        ("ABA Bank", "ABA-11294819", 1.75, "USD", "BOU VICHEKA", 4),
        ("Wing Bank", "WG-99182740", 80000, "KHR", "KEO SREYMOM", 4),
    ]

    for bank, txid, amt, curr, payer, dev_idx in tx_samples:
        dev_id = device_db_ids[dev_idx]
        raw_msg = (
            f"🔔 [Payment Notification]\n"
            f"Bank: {bank}\n"
            f"TxID: {txid}\n"
            f"Amount: {amt} {curr}\n"
            f"Payer: {payer}\n"
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"Status: SUCCESS (Voice Broadcast Sent)"
        )
        await conn.execute("""
            INSERT INTO transactions (device_id, bank_name, bank_tx_id, amount, currency, payer_name, raw_telegram_message, status, created_at)
            VALUES ($1, $2, $3, $4, $5::currency_type, $6, $7, 'PROCESSED', $8)
            ON CONFLICT (bank_name, bank_tx_id) DO NOTHING
        """, dev_id, bank, txid, amt, curr, payer, raw_msg, now - timedelta(minutes=random.randint(1, 180)))

    print("  ✓ Seeded 10 realistic payment transactions.")

    # 5. Seed Security Alerts (Admin Logs)
    security_alerts_data = [
        (device_db_ids[0], merchant_ids[0], "DUPLICATE_TX", "WARNING", "ABA Bank", "ABA-TXN-88291049", 4.50, "USD", "user_fake_992", "Suspicious Forwarder", "Duplicate receipt forwarded 2 times within 30 seconds", "Identical Bank Transaction ID detected in short interval"),
        (device_db_ids[1], merchant_ids[1], "UNAUTHORIZED_SENDER", "CRITICAL", "Telegram Bot", "TG-BOT-UNAUTH-01", 0.00, "USD", "user_unknown_441", "Spam Account", "Forwarded message from non-whitelisted bank bot", "Sender telegram user_id not present in authorized bank bot list"),
        (device_db_ids[2], merchant_ids[2], "MALFORMED_PAYMENT", "INFO", "ACLEDA Bank", "ACL-INVALID-99", 0.00, "USD", "user_test_101", "Tester", "Amount format could not be parsed: '$NaN'", "Invalid regex match on payment amount string"),
    ]

    for dev_id, merch_id, atype, sev, bank, txid, amt, curr, s_id, s_name, raw_m, reason in security_alerts_data:
        await conn.execute("""
            INSERT INTO security_alerts (
                device_id, merchant_id, alert_type, severity, 
                bank_name, bank_tx_id, amount, currency, 
                sender_user_id, sender_name, raw_message, reason, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """, dev_id, merch_id, atype, sev, bank, txid, amt, curr, s_id, s_name, raw_m, reason, now - timedelta(hours=random.randint(1, 12)))

    print("  ✓ Seeded 3 security and audit alert logs.")

    await conn.close()
    print("✨ Demo data seeding finished successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

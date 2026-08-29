FROM python:3.10-slim

WORKDIR /app

# ដំឡើង System dependencies ចាំបាច់ (ឧទាហរណ៍ សម្រាប់ qrcode និង lib ផ្សេងៗ)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ចម្លង និងដំឡើង Python Packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ចម្លង Source Code ទាំងអស់ចូល Docker
COPY . .

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
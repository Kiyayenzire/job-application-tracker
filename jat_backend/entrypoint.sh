FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for mysqlclient
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    pkg-config \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy all requirements files into the container preserving subfolder paths
COPY requirements.txt ./
COPY requirements/ ./requirements/

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Ensure entrypoint has execution permissions
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
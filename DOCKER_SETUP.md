# Docker PostgreSQL Setup Guide

Quick reference for setting up PostgreSQL databases on your home server.

**Note:** Commands are for Windows PowerShell with Docker Desktop.

## Quick Start

1. **Copy files to your server:**
   ```powershell
   # Copy docker-compose.yml and docker-compose.env.example to your server
   ```

2. **Create environment file:**
   ```powershell
   Copy-Item docker-compose.env.example .env
   # Or use: copy docker-compose.env.example .env
   # Edit .env and set your passwords (use Notepad or your preferred editor)
   notepad .env
   ```

3. **Start databases:**
   ```powershell
   docker-compose up -d
   ```

4. **Verify they're running:**
   ```powershell
   docker-compose ps
   ```

5. **Check logs if needed:**
   ```powershell
   docker-compose logs -f
   ```

## Connection Information

After setup, use these connection strings in your application:

**Acceptance Database:**
```
postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5433/reflectie_acc
```

**Production Database:**
```
postgresql://reflectie_user:YOUR_PASSWORD@YOUR_SERVER_IP:5432/reflectie_prod
```

## Common Commands

```powershell
# Start databases
docker-compose up -d

# Stop databases
docker-compose down

# View logs
docker-compose logs -f postgres-acc
docker-compose logs -f postgres-prod

# Restart a specific database
docker-compose restart postgres-acc

# Check database status
docker-compose ps

# Access PostgreSQL CLI
docker exec -it postgres-acc psql -U reflectie_user -d reflectie_acc
docker exec -it postgres-prod psql -U reflectie_user -d reflectie_prod
```

## Security Recommendations

1. **Use strong passwords** in your `.env` file
2. **Use SSH tunnel** for development (most secure):
   ```powershell
   # Using OpenSSH (Windows 10+ has built-in SSH)
   ssh -L 5433:localhost:5433 user@your_server_ip
   
   # Or use PuTTY for SSH tunneling (GUI option)
   ```
   Then connect to `localhost:5433` instead of your server IP

3. **Firewall rules**: Only open ports if necessary, prefer VPN/SSH tunnel
4. **SSL connections**: Add `?sslmode=require` to connection strings in production

## Backup

```powershell
# Backup acceptance (PowerShell date format)
$date = Get-Date -Format "yyyyMMdd"
docker exec postgres-acc pg_dump -U reflectie_user reflectie_acc | Out-File -FilePath "backup-acc-$date.sql" -Encoding utf8

# Backup production
docker exec postgres-prod pg_dump -U reflectie_user reflectie_prod | Out-File -FilePath "backup-prod-$date.sql" -Encoding utf8

# Alternative: Using redirection (works in PowerShell too)
docker exec postgres-acc pg_dump -U reflectie_user reflectie_acc > "backup-acc-$(Get-Date -Format 'yyyyMMdd').sql"

# Restore (example)
Get-Content backup-acc-20240101.sql | docker exec -i postgres-acc psql -U reflectie_user -d reflectie_acc
```

## Troubleshooting

**Can't connect from remote machine:**
- Check firewall rules (ports 5432, 5433) in Windows Firewall
- Verify containers are running: `docker-compose ps`
- Check logs: `docker-compose logs postgres-acc`
- Try SSH tunnel instead

**Container won't start:**
- Check logs: `docker-compose logs`
- Verify `.env` file exists and has all required variables
- Check if ports are already in use:
  ```powershell
  # PowerShell command to check ports
  netstat -ano | Select-String ":543"
  
  # Or more detailed:
  Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 5432 -or $_.LocalPort -eq 5433}
  ```

**"database does not exist" error:**
- **Most common cause**: `.env` file not being loaded or missing variables
  ```powershell
  # Verify .env file exists in same directory as docker-compose.yml
  Get-ChildItem .env
  # Or: dir .env
  # Or: Test-Path .env
  
  # View .env file contents
  Get-Content .env
  # Or: type .env
  # Or: notepad .env
  
  # Check if variables are being read
  docker-compose config | Select-String "POSTGRES_DB"
  
  # If variables show as empty, recreate .env file
  Copy-Item docker-compose.env.example .env
  notepad .env
  ```

- **Existing volumes with old data**:
  ```powershell
  # Stop containers
  docker-compose down
  
  # Remove volumes (⚠️ deletes all data)
  docker-compose down -v
  
  # Restart with fresh volumes
  docker-compose up -d
  ```

- **Verify database was created**:
  ```powershell
  # Check if database exists
  docker exec postgres-acc psql -U reflectie_user -l
  
  # Should show reflectie_acc in the list
  ```

- **Manual database creation** (if needed):
  ```powershell
  # Connect to postgres default database
  docker exec -it postgres-acc psql -U reflectie_user -d postgres
  
  # In the PostgreSQL prompt, create the database:
  CREATE DATABASE reflectie_acc;
  \q
  ```

**Password issues:**
- Reset password: Stop container, remove volume, restart with new password
- Or change password in running container:
  ```powershell
  docker exec -it postgres-acc psql -U reflectie_user -d reflectie_acc
  # In PostgreSQL prompt:
  ALTER USER reflectie_user WITH PASSWORD 'new_password';
  \q
  ```

## Windows-Specific Notes

- **Docker Desktop**: Make sure Docker Desktop is running before executing commands
- **File paths**: Use forward slashes or escaped backslashes in connection strings if needed
- **Line endings**: `.env` files should use LF or CRLF - both work with Docker Desktop
- **Permissions**: If you get permission errors, run PowerShell as Administrator
- **Docker Compose**: On Windows, you can use either `docker-compose` or `docker compose` (newer syntax)


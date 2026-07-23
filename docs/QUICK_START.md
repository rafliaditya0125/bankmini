# Quick Start Guide - Bank Mini

**🌐 Language:** English | [Bahasa Indonesia](./QUICK_START_ID.md)

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Default Credentials](#default-credentials)
6. [Dashboard Overview](#dashboard-overview)
7. [Common Commands](#common-commands)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

Before starting, ensure your system meets these requirements:

**Required Software:**
- PHP 8.2 or higher
- Composer (latest version)
- Node.js 18+ and npm
- MySQL 8.0+ or MariaDB 10.4+
- Web server (Apache/Nginx)

**PHP Extensions Required:**
- OpenSSL
- PDO
- Mbstring
- Tokenizer
- XML
- Ctype
- JSON
- BCMath
- Fileinfo
- GD

**Recommended:**
- Git for version control
- Redis for caching (optional)
- Supervisor for queue workers (optional)

---

## Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/bankmini.git
cd bankmini
```

### 2. Install PHP Dependencies
```bash
composer install
```

If you encounter memory limit errors:
```bash
COMPOSER_MEMORY_LIMIT=-1 composer install
```

### 3. Install Node Dependencies
```bash
npm install
```

For faster installation, you can use:
```bash
npm ci  # Uses package-lock.json exactly
```

### 4. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate
```

### 5. Database Setup

**Create Database:**
```sql
CREATE DATABASE bankmini_smk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Configure .env:**
Edit `.env` file and set database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bankmini_smk
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 6. Run Migrations and Seeders
```bash
# Run all migrations
php artisan migrate

# Seed database with sample data
php artisan db:seed

# Or run both at once
php artisan migrate --seed
```

The seeder will create:
- Default admin accounts (Superadmin, Admin, Teller)
- Sample departments (Jurusan)
- Sample classes (Rombel)
- Sample customer accounts
- Sample transactions

### 7. Storage Link
Create symbolic link for file uploads:
```bash
php artisan storage:link
```

### 8. Build Frontend Assets

**For Production:**
```bash
npm run build
```

**For Development:**
```bash
npm run dev
```

---

## Configuration

### Email Configuration (Optional)
For email notifications and OTP verification:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@bankmini.smk
MAIL_FROM_NAME="${APP_NAME}"
```

### WhatsApp OTP Configuration (Optional)
For WhatsApp OTP verification:

```env
FONNTE_TOKEN=your_fonnte_token
```

### Session Configuration
```env
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

### Cache Configuration
```env
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
```

---

## Running the Application

### Development Mode

Open **two separate terminals**:

**Terminal 1 - Laravel Development Server:**
```bash
php artisan serve
```
This starts Laravel at `http://localhost:8000`

**Terminal 2 - Vite Development Server (Optional but Recommended):**
```bash
npm run dev
```
This enables hot module replacement (HMR) for instant frontend updates.

### Production Mode

**1. Build Assets:**
```bash
npm run build
```

**2. Configure Web Server:**

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^(.*)$ public/$1 [L]
</IfModule>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name bankmini.local;
    root /path/to/bankmini/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

**3. Set Permissions:**
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

## Default Credentials

After seeding, you can login with these accounts:

| Role | Email/Username | Password | Description |
|------|----------------|----------|-------------|
| **Superadmin** | admin@bankmini.smk | superadmin | Full system access |
| **Admin** | admin2@bankmini.smk | admin | Account & transaction management |
| **Teller** | teller1@bankmini.smk | teller123 | Daily transaction operations |
| **Customer (Student)** | 2023001 (NIS) | 2023001 | Student account |
| **Customer (Teacher)** | 1990001 (NIP) | 1990001 | Teacher account |

**⚠️ Security Warning:** Change all default passwords in production!

---

## Dashboard Overview

### Superadmin Dashboard
**Access:** Full system control

**Features:**
- System-wide statistics (total customers, staff, balance)
- Today's transaction summary (deposits, withdrawals, transfers, payments)
- Customer management (CRUD operations)
- Staff management (Admin & Teller)
- Department and Class management
- System settings
- Audit trail
- Comprehensive reports

**Main Menu:**
- Dashboard
- Customers
- Staff
- Departments
- Classes
- Transactions
- Reports
- Audit Trail
- Settings
- Profile

### Admin Dashboard
**Access:** Customer and transaction management

**Features:**
- Similar to Superadmin but limited access
- Cannot manage other staff accounts
- Cannot access system settings
- Full transaction capabilities

### Teller Dashboard
**Access:** Daily transaction operations

**Features:**
- Today's transaction statistics
- Quick transaction buttons
- Deposit form
- Withdrawal form
- Transfer form
- Payment form
- Transaction history (own transactions only)
- Customer lookup

**Main Menu:**
- Dashboard
- Deposit (Setor)
- Withdrawal (Tarik)
- Transfer
- Payment (Bayar)
- Transaction History
- Profile

### Customer Dashboard
**Access:** View account and transaction history

**Features:**
- Account balance display
- Account number
- Recent transactions (5 latest)
- Full transaction history
- Transaction receipts
- Profile management
- Email verification
- Password change

**Main Menu:**
- Dashboard
- Transactions
- Ledger (Pembukuan)
- Profile

---

## Common Commands

### Database Operations
```bash
# Reset database completely
php artisan migrate:fresh --seed

# Run specific seeder
php artisan db:seed --class=UserSeeder

# Create database backup
php artisan backup:run
```

### Cache Management
```bash
# Clear all caches
php artisan optimize:clear

# Or clear individually
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Rebuild cache
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Code Generation
```bash
# Create controller
php artisan make:controller UserController

# Create model with migration
php artisan make:model Customer -m

# Create migration
php artisan make:migration create_customers_table

# Create seeder
php artisan make:seeder CustomerSeeder
```

### Queue Workers (If Using Queues)
```bash
# Run queue worker
php artisan queue:work

# Run specific queue
php artisan queue:work --queue=emails

# Restart all workers
php artisan queue:restart
```

### Maintenance Mode
```bash
# Enable maintenance mode
php artisan down

# Enable with secret bypass
php artisan down --secret="1630542a-246b-4b66-afa1-dd72a4c43515"

# Disable maintenance mode
php artisan up
```

---

## Troubleshooting

### Error: "Base table or view not found"
**Cause:** Database tables not created

**Solution:**
```bash
php artisan migrate
# or
php artisan migrate:fresh --seed
```

### Error: "Class not found" or "Class does not exist"
**Cause:** Autoload files not updated

**Solution:**
```bash
composer dump-autoload
php artisan clear-compiled
php artisan config:clear
```

### Error: "Vite manifest not found"
**Cause:** Frontend assets not built

**Solution:**
```bash
npm run build
# or for development
npm run dev
```

### Error: "npm command not found"
**Cause:** Node.js not installed

**Solution:**
- Install Node.js from https://nodejs.org/
- Recommended version: LTS (18.x or higher)

### Error: "SQLSTATE[HY000] [1045] Access denied"
**Cause:** Wrong database credentials

**Solution:**
- Check `.env` file database settings
- Verify MySQL username and password
- Test connection: `mysql -u username -p`

### Error: "Maximum execution time exceeded"
**Cause:** PHP timeout during composer install

**Solution:**
```bash
# Increase time limit
php -d max_execution_time=300 /usr/local/bin/composer install
```

### Error: "The stream or file could not be opened"
**Cause:** Permission issues on storage folders

**Solution:**
```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

### Page Shows "419 | Page Expired"
**Cause:** CSRF token expired

**Solution:**
- Clear browser cache
- Or: `php artisan config:clear`

### Frontend Not Updating
**Cause:** Browser cache or build issue

**Solution:**
```bash
# Clear browser cache (Ctrl+Shift+R)
# Rebuild frontend
npm run build
# Clear Laravel cache
php artisan optimize:clear
```

---

## Next Steps

After successful installation:

1. **Change Default Passwords** - Security priority!
2. **Configure Email Settings** - For notifications
3. **Set Up Departments** - Add your school's departments
4. **Create Classes** - Set up class structure (Rombel)
5. **Import Students** - Use Excel import feature
6. **Test Transactions** - Try deposit, withdrawal, transfer, payment
7. **Review Audit Trail** - Check logging functionality
8. **Explore Reports** - Test financial reports

## Additional Resources

- 📖 [Complete Feature Documentation](./FEATURES.md)
- 💳 [Payment System Guide](./PAYMENT_SYSTEM.md)
- 🔧 Laravel Documentation: https://laravel.com/docs
- ⚛️ React Documentation: https://react.dev
- 🎨 Tailwind CSS: https://tailwindcss.com

---

**📅 Last Updated:** 18 June 2026  
**📝 Version:** 1.0.0  
**👥 Contributors:** Bank Mini Development Team

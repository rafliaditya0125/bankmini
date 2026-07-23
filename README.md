# 🏦 Bank Mini - School Digital Banking System

**🌐 Language:** English | [Bahasa Indonesia](./README_ID.md)

---

### Overview

**Bank Mini** is a modern digital banking platform specifically designed to meet the financial ecosystem needs in vocational high schools (SMK). This application integrates academic data management (Departments & Classes) with secure, transparent, and accountable daily banking operations.

### 🎯 Project Goals

This project aims to provide a modern, paperless school mini-bank management system with high levels of security and fund tracking (audit trail).

### ✨ Key Features

**Account Management**
- Multi-role access control (Superadmin, Admin, Teller, Customer)
- Customer types: Student, Teacher, Class, Organization, Payment
- Unique account number generation
- Account status management

**Financial Transactions**
- Cash deposits (Setor)
- Cash withdrawals (Tarik)
- Inter-account transfers
- Payment system with single-transaction architecture ⭐ NEW
- Real-time balance updates
- Transaction fee and interest tracking

**Security & Authentication**
- Multi-factor authentication (MFA & OTP)
- Email and WhatsApp verification
- Dual-step authentication for email changes
- Role-based access control (RBAC)
- Brute force protection

**Academic Integration**
- Department (Jurusan) management
- Class (Rombel) structure integration
- Automatic grade promotion
- Batch class promotion
- Alumni status tracking

**Audit & Reporting**
- Immutable audit trail
- Comprehensive financial reports
- Transaction history with filters
- PDF and Excel export
- General ledger and mutation reports

**Additional Features**
- Responsive dashboard with analytics
- Real-time notifications
- Receipt printing (thermal & passbook)
- Data import/export (Excel)
- Maintenance mode
- Profile management with photo upload

### 🛠️ Technology Stack

Built with modern monolithic architecture using industry-leading frameworks:

- **Backend**: Laravel 11.x (PHP 8.2+)
- **Frontend**: React 18 & TypeScript
- **Bridge**: Inertia.js (Seamless Laravel & React integration)
- **Styling**: Tailwind CSS
- **Database**: MariaDB / MySQL
- **Authentication**: Laravel Sanctum & Session Auth
- **Build Tools**: Vite

### 📦 Requirements

- PHP 8.2 or higher
- Composer
- Node.js 18+ & npm
- MySQL 8.0+ or MariaDB 10.4+
- Apache/Nginx web server

### 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/bankmini.git
cd bankmini

# Install dependencies
composer install
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Configure database in .env
# DB_DATABASE=bankmini_smk

# Run migrations and seeders
php artisan migrate --seed

# Build frontend
npm run build

# Start development servers
php artisan serve          # Terminal 1
npm run dev               # Terminal 2 (optional)
```

Access the application at `http://localhost:8000`

### 📚 Documentation

Detailed documentation about usage, setup, and specific features:

- 📖 [Complete Feature List](./docs/FEATURES.md)
- 🚀 [Installation & Quick Start Guide](./docs/QUICK_START.md)
- 💳 [Payment System Documentation](./docs/PAYMENT_SYSTEM.md)

### 🔑 Default Credentials

**Testing Accounts:**

| Role | Username/Email | Password |
|------|----------------|----------|
| Superadmin | admin@bankmini.smk | superadmin |
| Admin | admin2@bankmini.smk | admin |
| Teller | teller1@bankmini.smk | teller123 |
| Customer (Student) | 2023001 | 2023001 |

⚠️ **Security Warning:** Change all default passwords in production!

### 👥 Development Team

This application was created by:
- [Ihsan Sabana](https://github.com/ihsansabanaa)
- [Rafli Aditya](https://github.com/rafliaditya0125)

### 📄 License

This project is developed for educational administration and school banking ecosystem needs.

---

**📅 Last Updated:** 18 June 2026  
**📝 Version:** 1.0.0

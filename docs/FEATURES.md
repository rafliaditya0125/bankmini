# Bank Mini - Complete Features Documentation

**🌐 Language:** [English](FEATURES.md) | [Bahasa Indonesia](FEATURES_ID.md)

---

## Table of Contents
1. [User Management](#user-management-en)
2. [Account Management](#account-management-en)
3. [Transaction System](#transaction-system-en)
4. [Payment System](#payment-system-en)
5. [Financial Reporting](#financial-reporting-en)
6. [Security & Audit](#security-audit-en)
7. [Dashboard & Analytics](#dashboard-analytics-en)
8. [Additional Features](#additional-features-en)

---

## User Management (EN)

### Role-Based Access Control
The system implements four distinct user roles with specific permissions:

**1. Superadmin**
- Full system control
- User and staff management
- Academic unit management (Departments/Classes)
- System settings configuration
- Complete audit trail access
- Data backup and restore

**2. Admin**
- Customer account management
- Transaction processing (all types)
- Financial reporting
- Limited system settings

**3. Teller**
- Daily transaction operations
- Deposit, withdrawal, transfer, payment processing
- Receipt printing
- Personal transaction history only

**4. Customer (Nasabah)**
- Balance monitoring
- Transaction history viewing
- Profile management
- Payment processing
- Digital receipt access

---

## Account Management (EN)

### Account Types
The system supports four types of customer accounts:

**1. Student Account (Siswa)**
- Linked to Student ID (NIS)
- Associated with Department and Class
- Automatic grade promotion support
- Parent/guardian information
- Alumni status tracking

**2. Teacher Account (Guru)**
- Linked to Employee ID (NIP)
- Faculty/staff designation
- Separate from student system

**3. Class Account (Kelas)**
- Collective class fund management
- Linked to specific class (Rombel)
- Multiple authorized users possible

**4. Organization Account (Organisasi)**
- School organization funds
- Independent from class structure
- Activity-based management

### Account Features
- Unique account number generation
- Account status management (Active/Inactive)
- Balance tracking
- Transaction history
- Email and phone verification
- Password reset functionality
- Profile photo support

---

## Transaction System (EN)

### 1. Deposit (Setor)
**Features:**
- Cash deposit to customer account
- Multiple transaction types support
- Real-time balance update
- Teller assignment tracking
- Receipt generation (digital & print)
- Minimum denomination validation
- Transaction code generation (BKM)

**Workflow:**
1. Teller enters account number
2. System displays customer info
3. Enter deposit amount
4. System validates minimum denomination
5. Generate transaction code
6. Update balance
7. Create audit log
8. Send notification
9. Display receipt

### 2. Withdrawal (Tarik)
**Features:**
- Cash withdrawal from customer account
- Balance validation
- Minimum withdrawal amount check
- Transaction code generation (BKK)
- Receipt printing
- Insufficient balance prevention

**Workflow:**
1. Lookup customer account
2. Check current balance
3. Enter withdrawal amount
4. Validate sufficient balance
5. Generate transaction code
6. Debit account balance
7. Create audit log
8. Send notification
9. Print receipt

### 3. Transfer
**Features:**
- Inter-account money transfer
- Sender and receiver validation
- Dual transaction records
- Both parties receive notifications
- Transaction history for both accounts
- Transfer code generation
- Same-account prevention

**Workflow:**
1. Enter sender account number
2. Enter receiver account number
3. Validate both accounts active
4. Enter transfer amount
5. Check sender balance
6. Create two transaction records
7. Update both balances
8. Generate transfer code
9. Send notifications to both parties
10. Display receipt

### 4. Payment (Bayar) ⭐ NEW
**Features:**
- Single-transaction architecture
- Payment to designated payment accounts
- Dual perspective (payer/receiver)
- Payment type categorization
- Specialized receipts
- Dashboard statistics

**Workflow:**
1. Enter payer account number
2. Select payment type from dropdown
3. Enter payment amount
4. Validate payer balance
5. Create single transaction record
6. Update both balances
7. Generate payment code
8. Send notification to payer
9. Display receipt

**Unique Characteristics:**
- Only 1 database record per payment
- Receiver can view payment history
- Different receipts for payer vs receiver
- Appears in both transaction histories
- Statistics tracked separately

[See detailed documentation](./PAYMENT_SYSTEM.md)

---

## Payment System (EN)

### Architecture
Unlike transfers (2 records), payments use single-transaction architecture:

**Database:**
- 1 record with `nasabah_id` = payer
- `nasabah_tujuan_id` = payment account
- Both balances updated

**History Queries:**
- Payer: `WHERE nasabah_id = payer_id`
- Receiver: `WHERE nasabah_tujuan_id = receiver_id AND jenis_transaksi = 'bayar'`

**Display:**
- Payer sees: 🔴 "PAYMENT" with payment type name
- Receiver sees: 🟢 "RECEIVED PAYMENT" with payer info

### Payment Account Types
Examples:
- School Uniform
- Monthly Tuition
- Laboratory Fee
- Library Fee
- Sports Equipment
- Event Participation
- Custom payment types

---

## Financial Reporting (EN)

### Reports Available

**1. Transaction Reports**
- Daily transaction summary
- Weekly transaction trends
- Monthly transaction analysis
- Transaction type breakdown
- Teller performance reports
- Export to PDF/Excel

**2. Balance Reports**
- Total system balance
- Balance by account type
- Balance by department
- Balance by class
- Individual account statements

**3. Audit Reports**
- User activity logs
- Transaction audit trail
- Data modification history
- Security event logs
- Login attempt tracking

**4. Statistical Reports**
- Transaction volume trends
- Peak transaction times
- Most active accounts
- Transaction type distribution
- Payment type analytics ⭐ NEW

---

## Security & Audit (EN)

### Authentication & Authorization
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Session management
- CSRF protection
- XSS prevention

### Email & Phone Verification
- OTP verification via email
- WhatsApp OTP support
- Dual-step email change process
- Phone number verification
- Resend OTP functionality

### Audit Trail
- All transactions logged
- User activity tracking
- Data modification history
- Security event logging
- Immutable audit records
- IP address tracking
- User agent logging

### Data Protection
- Input validation
- SQL injection prevention
- Mass assignment protection
- Secure file uploads
- Data encryption at rest
- HTTPS enforcement

### Brute Force Protection
- Login attempt limiting
- Temporary IP blocking
- Account lockout mechanism
- Suspicious activity detection

---

## Dashboard & Analytics (EN)

### Teller Dashboard
**Statistics Cards:**
- Today's transactions count
- Total deposits today
- Total withdrawals today
- Total transfers today
- Total payments today ⭐ NEW

**Charts:**
- Daily transaction trends (7 days)
- Weekly trends (4 weeks)
- Monthly trends (12 months)
- Transaction volume graph
- Type distribution

**Quick Access:**
- Recent transactions (10 latest)
- Quick transaction buttons
- Customer lookup

### Superadmin Dashboard
**Statistics Cards:**
- Total customers
- Total staff
- Today's transactions
- System total balance
- Deposits/Withdrawals/Transfers/Payments today ⭐ NEW

**Charts:**
- Same as Teller + system-wide data
- Department analytics
- Class analytics

**Quick Access:**
- Recent customers
- Recent transactions
- System alerts

### Customer Dashboard
**Information Display:**
- Current balance
- Account status
- Recent transactions (5 latest)
- Quick payment access
- Account summary

---

## Additional Features (EN)

### 1. Academic Integration
- Department (Jurusan) management
- Class (Rombel) structure
- Grade levels (10, 11, 12)
- Automatic grade promotion
- Batch class promotion
- Alumni status tracking
- Alumni account retention period

### 2. Data Import/Export
- Excel import for bulk customer creation
- Transaction export (PDF/Excel)
- Balance report export
- Template download
- Error handling and validation

### 3. Receipt & Printing
- Digital receipt display
- Thermal printer support
- Passbook printer integration (WebUSB)
- Transaction code on receipts
- QR code generation (optional)
- Print preview
- Reprint capability

### 4. Notification System
- Email notifications
- In-app notifications
- Transaction alerts
- Balance updates
- Security alerts
- System announcements

### 5. Profile Management
- Photo upload
- Personal information edit
- Password change
- Email update with verification
- Phone number update
- Address management

### 6. Maintenance Mode
- System-wide maintenance toggle
- Custom maintenance message
- Automatic user redirect
- Administrator bypass
- Scheduled maintenance support

---

**📅 Last Updated:** 18 Juni 2026  
**📝 Version:** 1.0.0  
**👥 Contributors:** Development Team

**📚 Related Documentation:**
- [Payment System Details](./PAYMENT_SYSTEM.md) - Payment Complete Documentation
- [Quick Start Guide](./QUICK_START.md) - Quick Start Guide
- [API Documentation](#) - API DOcumentation (coming soon)

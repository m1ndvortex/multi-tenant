# Requirements Document

## Introduction

HesaabPlus is an elite, multi-tenant, cloud-native business management SaaS platform designed primarily for the Iranian market with Persian (RTL) interface. The system consists of two separate applications: a Super Admin Platform (for platform owner management) and a Tenant Application (for customer business management). Both applications require complete frontend and backend implementations with comprehensive accounting, specialized dual-mode invoicing with gold market support, automated backup systems, and advanced reporting capabilities. The entire system must be fully containerized using Docker and Docker Compose.

## Requirements

### Requirement 1: Docker Infrastructure and Multi-Tenant Architecture Foundation

**User Story:** As a platform owner, I want a fully containerized, secure multi-tenant architecture so that multiple businesses can use the platform while maintaining complete data isolation and easy deployment.

#### Acceptance Criteria

1. WHEN the system is deployed THEN it SHALL use Docker and Docker Compose for full containerization
2. WHEN containers are running THEN the system SHALL include separate containers for FastAPI backend, React frontend, PostgreSQL, Redis, and Celery workers
3. WHEN the system is deployed THEN it SHALL use a shared database, shared schema architecture with PostgreSQL
4. WHEN any data is stored THEN the system SHALL include a tenant_id column on all relevant tables
5. WHEN a user accesses data THEN the system SHALL enforce strict data isolation based on tenant_id
6. WHEN authentication occurs THEN the system SHALL use JWT tokens for secure access
7. WHEN caching is needed THEN the system SHALL use Redis for session data, permissions, and frequently accessed data
8. WHEN long-running tasks are required THEN the system SHALL use Celery with Redis as broker for asynchronous operations
9. WHEN deploying THEN the system SHALL support both Super Admin Platform and Tenant Application as separate applications

### Requirement 2: Super Admin Platform - Backend API Core Management

**User Story:** As a platform owner, I want a comprehensive Super Admin backend API so that I can manage all tenants, subscriptions, and platform operations effectively.

#### Acceptance Criteria

1. WHEN accessing Super Admin APIs THEN the system SHALL provide god-mode access endpoints for platform metadata and health
2. WHEN managing tenants THEN the API SHALL provide endpoints to view, create, approve, suspend, or delete tenant accounts
3. WHEN handling subscriptions THEN the API SHALL provide endpoints to manually manage payment cycles and subscription status
4. WHEN confirming payments THEN the API SHALL provide endpoints to find "Pending Payment" users and activate Pro subscriptions
5. WHEN monitoring activity THEN the API SHALL provide endpoints to show users active in the last 5 minutes via Redis heartbeat
6. WHEN viewing analytics THEN the API SHALL provide endpoints for signup trends, active subscriptions, invoice volume, and MRR
7. WHEN monitoring health THEN the API SHALL provide endpoints for real-time CPU, RAM, database performance, and Celery job queues
8. WHEN errors occur THEN the API SHALL provide endpoints to retrieve API errors with timestamp, message, and affected tenant/user
9. WHEN authenticating THEN the API SHALL use separate JWT authentication for Super Admin access
10. WHEN processing requests THEN the API SHALL validate Super Admin permissions for all endpoints

### Requirement 3: Super Admin Platform - Frontend Dashboard

**User Story:** As a platform owner, I want a comprehensive Super Admin frontend dashboard so that I can visually manage all platform operations through an intuitive interface.

#### Acceptance Criteria

1. WHEN accessing the Super Admin frontend THEN the system SHALL provide a React/TypeScript dashboard with Persian RTL support
2. WHEN viewing tenant management THEN the frontend SHALL display a searchable, filterable table of all tenants
3. WHEN managing tenants THEN the frontend SHALL provide forms to create, approve, suspend, or delete tenant accounts
4. WHEN handling subscriptions THEN the frontend SHALL display subscription status with filter options (Free, Pro, Pending Payment, Expired)
5. WHEN confirming payments THEN the frontend SHALL provide one-click workflow to activate Pro subscriptions with duration selection
6. WHEN monitoring activity THEN the frontend SHALL display "Who is Online" widget showing active users in real-time
7. WHEN viewing analytics THEN the frontend SHALL display interactive charts for signup trends, MRR, and platform metrics using Chart.js
8. WHEN monitoring health THEN the frontend SHALL display real-time system health dashboard with CPU, RAM, database metrics
9. WHEN viewing errors THEN the frontend SHALL display API error log table with filtering and search capabilities
10. WHEN using the interface THEN the frontend SHALL follow the gradient design system from ui.md steering document

### Requirement 4: Super Admin Platform - User Impersonation Backend

**User Story:** As a platform owner, I want secure user impersonation backend APIs so that I can provide exceptional customer support and troubleshoot issues directly.

#### Acceptance Criteria

1. WHEN initiating impersonation THEN the API SHALL provide endpoint to generate impersonation JWT tokens for specific users
2. WHEN impersonating THEN the API SHALL use short-lived JWT tokens with special impersonation claims
3. WHEN impersonation occurs THEN the API SHALL record every action in an immutable audit trail with timestamps
4. WHEN impersonation ends THEN the API SHALL provide endpoint to terminate impersonation session
5. WHEN validating impersonation THEN the API SHALL verify Super Admin permissions before allowing impersonation
6. WHEN logging actions THEN the API SHALL store impersonation audit logs with admin_id, target_user_id, action, and timestamp

### Requirement 5: Super Admin Platform - User Impersonation Frontend

**User Story:** As a platform owner, I want a user impersonation interface so that I can seamlessly access tenant applications for support purposes.

#### Acceptance Criteria

1. WHEN selecting a user THEN the frontend SHALL provide "Impersonate" button in tenant management interface
2. WHEN impersonation starts THEN the frontend SHALL redirect to Tenant Application with impersonation session
3. WHEN impersonating THEN the frontend SHALL display highly visible banner indicating active impersonation session
4. WHEN in impersonation mode THEN the frontend SHALL show admin name, target user, and session duration
5. WHEN ending impersonation THEN the frontend SHALL provide clear "End Impersonation" button in banner
6. WHEN impersonation ends THEN the frontend SHALL redirect back to Super Admin Platform
7. WHEN viewing audit trail THEN the frontend SHALL display impersonation logs with filtering capabilities

### Requirement 6: Super Admin Platform - Operational Recovery Backend

**User Story:** As a platform owner, I want per-tenant backup and restore backend capabilities so that I can recover individual tenant data without affecting other tenants.

#### Acceptance Criteria

1. WHEN daily backups run THEN the Celery worker SHALL create separate encrypted SQL files for each tenant using tenant_id
2. WHEN backups are created THEN the system SHALL upload tenant-specific backups to Cloudflare R2 with naming convention tenant_id_backup_YYYY-MM-DD.sql.gz
3. WHEN backup process runs THEN the API SHALL log backup status, file size, and upload confirmation for each tenant
4. WHEN restore is requested THEN the API SHALL provide endpoint to list available backup points for specific tenant
5. WHEN initiating restore THEN the API SHALL validate admin permissions and tenant existence
6. WHEN restoring data THEN the API SHALL delete current tenant data and insert backup data in single PostgreSQL transaction
7. IF restore fails THEN the API SHALL rollback the entire transaction and return error details
8. WHEN restore completes THEN the API SHALL log restore action with admin_id, tenant_id, backup_date, and timestamp

### Requirement 7: Super Admin Platform - Operational Recovery Frontend

**User Story:** As a platform owner, I want a tenant recovery interface so that I can easily restore tenant data when needed.

#### Acceptance Criteria

1. WHEN accessing tenant recovery THEN the frontend SHALL provide "Tenant Recovery" section in admin dashboard
2. WHEN selecting tenant THEN the frontend SHALL display list of available daily backup points with dates and file sizes
3. WHEN initiating restore THEN the frontend SHALL display critical warning modal about data loss after backup point
4. WHEN confirming restore THEN the frontend SHALL require typing "RESTORE" confirmation phrase to proceed
5. WHEN restore is processing THEN the frontend SHALL show progress indicator and prevent other actions
6. WHEN restore completes THEN the frontend SHALL display success message with restore details
7. IF restore fails THEN the frontend SHALL display error message with failure reason
8. WHEN viewing recovery history THEN the frontend SHALL show log of all restore operations with filters

### Requirement 8: Super Admin Platform - Disaster Recovery Backend

**User Story:** As a platform owner, I want full platform backup and restore backend capabilities so that I can recover from catastrophic failures.

#### Acceptance Criteria

1. WHEN nightly backups run THEN the Celery worker SHALL perform full pg_dump of entire PostgreSQL database
2. WHEN backups are created THEN the system SHALL encrypt backup files using AES-256 encryption
3. WHEN uploading backups THEN the system SHALL upload to both Cloudflare R2 and Backblaze B2 with verification
4. WHEN backup completes THEN the API SHALL log backup status, file size, and upload confirmation to both storage providers
5. WHEN listing backups THEN the API SHALL provide endpoint to retrieve available full platform backups from both storage providers
6. WHEN validating backups THEN the API SHALL verify backup integrity and accessibility from both storage locations
7. WHEN disaster recovery is initiated THEN the API SHALL provide endpoints to download and verify backup files
8. WHEN storing configuration THEN the system SHALL maintain Docker configurations and deployment scripts in version control

### Requirement 9: Super Admin Platform - Disaster Recovery Frontend

**User Story:** As a platform owner, I want a disaster recovery dashboard so that I can monitor and manage full platform backups.

#### Acceptance Criteria

1. WHEN accessing DR dashboard THEN the frontend SHALL display backup status for both Cloudflare R2 and Backblaze B2
2. WHEN viewing backup history THEN the frontend SHALL show list of full platform backups with dates, sizes, and storage locations
3. WHEN monitoring backup health THEN the frontend SHALL display backup success/failure status with alerts for failed backups
4. WHEN verifying backups THEN the frontend SHALL provide "Test Backup Integrity" button for each backup
5. WHEN backup verification runs THEN the frontend SHALL show progress and results of integrity checks
6. WHEN viewing storage usage THEN the frontend SHALL display storage consumption charts for both backup providers
7. WHEN managing retention THEN the frontend SHALL provide interface to configure backup retention policies
8. WHEN disaster recovery is needed THEN the frontend SHALL display documented recovery procedures and backup download links

### Requirement 10: Tenant Application - Subscription Management Backend

**User Story:** As a business owner, I want subscription tier backend APIs so that the system can enforce limits and features based on my subscription plan.

#### Acceptance Criteria

1. WHEN checking Free tier limits THEN the API SHALL enforce 1 user, 10 products, 10 customers, 10 invoices/month limits
2. WHEN checking Pro tier access THEN the API SHALL allow up to 5 users with role-based permissions
3. WHEN accessing Pro features THEN the API SHALL provide unlimited items, advanced reporting endpoints, and API access
4. WHEN subscription expires THEN the API SHALL restrict access to paid feature endpoints and return appropriate error codes
5. WHEN upgrading subscription THEN the API SHALL immediately update tenant permissions and unlock Pro feature endpoints
6. WHEN validating actions THEN the API SHALL check subscription limits before allowing resource creation
7. WHEN retrieving subscription info THEN the API SHALL provide endpoint for current subscription status, limits, and usage

### Requirement 11: Tenant Application - Subscription Management Frontend

**User Story:** As a business owner, I want a subscription management interface so that I can see my current plan, usage, and upgrade options.

#### Acceptance Criteria

1. WHEN viewing subscription THEN the frontend SHALL display current plan (Free/Pro), limits, and usage statistics
2. WHEN approaching limits THEN the frontend SHALL show warning messages for Free tier users near their limits
3. WHEN limits are exceeded THEN the frontend SHALL display upgrade prompts and disable creation of new resources
4. WHEN subscription expires THEN the frontend SHALL show expiration notice and restrict access to Pro features
5. WHEN upgrading is needed THEN the frontend SHALL provide clear upgrade call-to-action buttons
6. WHEN viewing usage THEN the frontend SHALL display progress bars for products, customers, and monthly invoice counts
7. WHEN Pro features are accessed THEN the frontend SHALL show appropriate interfaces for role management and advanced features

### Requirement 12: Tenant Application - Dual Invoice System Backend

**User Story:** As a business owner, I want dual invoice backend APIs so that I can create and manage both general and gold-specific invoices.

#### Acceptance Criteria

1. WHEN creating invoices THEN the API SHALL provide endpoints for both General Invoice (فاکتور عمومی) and Gold Invoice (فاکتور طلا) types
2. WHEN creating General Invoice THEN the API SHALL accept standard fields: customer, items, quantities, prices, taxes
3. WHEN creating Gold Invoice THEN the API SHALL accept additional fields per line item: Weight (وزن), Labor Fee (اجرت), Profit (سود), VAT (مالیات)
4. WHEN saving invoices THEN the API SHALL store invoice type and type-specific data in appropriate database tables
5. WHEN retrieving invoices THEN the API SHALL return invoices with type-specific fields based on invoice type
6. WHEN validating invoices THEN the API SHALL enforce required fields based on invoice type
7. WHEN calculating totals THEN the API SHALL compute totals differently for General vs Gold invoices

### Requirement 13: Tenant Application - Dual Invoice System Frontend

**User Story:** As a business owner, I want dual invoice creation interfaces so that I can easily create appropriate invoices for different business types.

#### Acceptance Criteria

1. WHEN creating invoices THEN the frontend SHALL provide invoice type selection: General Invoice (فاکتور عمومی) or Gold Invoice (فاکتور طلا)
2. WHEN creating General Invoice THEN the frontend SHALL display standard invoice form with customer, items, quantities, prices
3. WHEN creating Gold Invoice THEN the frontend SHALL display additional fields per line item: Weight (وزن), Labor Fee (اجرت), Profit (سود), VAT (مالیات)
4. WHEN viewing invoices THEN the frontend SHALL display appropriate fields and calculations based on invoice type
5. WHEN listing invoices THEN the frontend SHALL show invoice type indicators and type-specific summary information
6. WHEN printing invoices THEN the frontend SHALL generate PDF layouts appropriate for each invoice type
7. WHEN editing invoices THEN the frontend SHALL maintain invoice type and show relevant fields for editing

### Requirement 14: Tenant Application - General Installment System Backend

**User Story:** As a business owner, I want general installment backend APIs so that I can offer payment plans to customers for standard goods and services.

#### Acceptance Criteria

1. WHEN creating installment invoice THEN the API SHALL fix the total invoice value and create installment schedule
2. WHEN setting up installments THEN the API SHALL accept number of installments, due dates, and payment amounts
3. WHEN payments are made THEN the API SHALL track each payment against remaining currency balance
4. WHEN calculating balances THEN the API SHALL provide endpoints for outstanding balance and payment history
5. WHEN payment is overdue THEN the API SHALL automatically mark installment as overdue based on due dates
6. WHEN installment is completed THEN the API SHALL mark invoice as fully paid when total payments equal invoice amount
7. WHEN retrieving installments THEN the API SHALL provide endpoints for installment schedules, payment status, and overdue amounts

### Requirement 15: Tenant Application - General Installment System Frontend

**User Story:** As a business owner, I want general installment management interfaces so that I can easily manage customer payment plans.

#### Acceptance Criteria

1. WHEN creating installment invoice THEN the frontend SHALL provide installment setup form with payment schedule configuration
2. WHEN setting installments THEN the frontend SHALL allow specification of number of payments, due dates, and amounts
3. WHEN viewing installments THEN the frontend SHALL display payment schedule with due dates, amounts, and payment status
4. WHEN payments are made THEN the frontend SHALL provide payment recording interface with remaining balance display
5. WHEN installments are overdue THEN the frontend SHALL highlight overdue payments with visual indicators
6. WHEN viewing customer THEN the frontend SHALL show all installment plans and their current status
7. WHEN installment completes THEN the frontend SHALL show completion status and payment history

### Requirement 16: Tenant Application - Gold Installment System Backend

**User Story:** As a gold business owner, I want weight-based installment backend APIs so that I can sell gold on installments where debt is settled based on gold weight, not fixed currency.

#### Acceptance Criteria

1. WHEN creating gold installment THEN the API SHALL track debt in grams of gold with precise decimal calculations
2. WHEN setting daily gold price THEN the API SHALL provide endpoint for tenant to input and update current gold price
3. WHEN customer makes payment THEN the API SHALL calculate settled gold weight based on payment date's gold price
4. WHEN calculating remaining debt THEN the API SHALL provide endpoints showing remaining weight due in grams (مانده به گرم)
5. WHEN payment is recorded THEN the API SHALL update remaining gold weight and store payment with gold price used
6. WHEN installment is completed THEN the API SHALL mark as complete when remaining gold weight reaches zero
7. WHEN retrieving gold prices THEN the API SHALL provide historical gold price data for payment calculations
8. WHEN validating payments THEN the API SHALL ensure payment amounts and gold weight calculations are accurate

### Requirement 17: Tenant Application - Gold Installment System Frontend

**User Story:** As a gold business owner, I want gold installment management interfaces so that I can easily manage weight-based payment plans.

#### Acceptance Criteria

1. WHEN creating gold installment THEN the frontend SHALL provide gold-specific installment form with weight tracking
2. WHEN setting gold price THEN the frontend SHALL provide daily gold price input interface with price history
3. WHEN recording payments THEN the frontend SHALL show payment amount, current gold price, and calculated weight settlement
4. WHEN viewing gold installments THEN the frontend SHALL display remaining weight due in grams (مانده به گرم) prominently
5. WHEN payment is made THEN the frontend SHALL update remaining gold weight display in real-time
6. WHEN viewing customer profile THEN the frontend SHALL show all gold installments with weight-based debt summary
7. WHEN installment completes THEN the frontend SHALL show completion with total weight settled and payment history
8. WHEN managing gold prices THEN the frontend SHALL provide gold price management interface with historical data

### Requirement 18: Tenant Application - Comprehensive Accounting Backend

**User Story:** As a business owner, I want comprehensive accounting backend APIs so that I can manage all financial aspects of my business automatically.

#### Acceptance Criteria

1. WHEN financial transactions occur THEN the API SHALL automatically generate correct journal entries with debits and credits
2. WHEN managing receivables THEN the API SHALL provide endpoints to track all invoices, payments, and customer debts
3. WHEN managing payables THEN the API SHALL provide endpoints to handle bills and payments to suppliers
4. WHEN reconciling bank accounts THEN the API SHALL provide endpoints to import bank statements and match transactions
5. WHEN handling gold installments THEN the API SHALL create specialized journal entries for fluctuating asset values
6. WHEN accessing accounts THEN the API SHALL provide endpoints for General Ledger and Chart of Accounts
7. WHEN calculating balances THEN the API SHALL provide real-time account balance calculations
8. WHEN generating reports THEN the API SHALL provide endpoints for trial balance, profit & loss, and balance sheet
9. WHEN validating entries THEN the API SHALL ensure all journal entries balance (debits = credits)

### Requirement 19: Tenant Application - Comprehensive Accounting Frontend

**User Story:** As a business owner, I want comprehensive accounting interfaces so that I can easily manage and view all financial aspects of my business.

#### Acceptance Criteria

1. WHEN viewing General Ledger THEN the frontend SHALL display all journal entries with search and filter capabilities
2. WHEN managing Chart of Accounts THEN the frontend SHALL provide interface to create, edit, and organize account categories
3. WHEN viewing receivables THEN the frontend SHALL display customer balances, aging reports, and payment tracking
4. WHEN managing payables THEN the frontend SHALL provide supplier bill management and payment scheduling
5. WHEN reconciling accounts THEN the frontend SHALL provide bank reconciliation interface with drag-and-drop matching
6. WHEN viewing financial reports THEN the frontend SHALL display trial balance, P&L, and balance sheet with export options
7. WHEN creating journal entries THEN the frontend SHALL provide manual journal entry form with validation
8. WHEN handling gold transactions THEN the frontend SHALL show specialized accounting treatment for gold installments

### Requirement 20: Tenant Application - Advanced Reporting Backend

**User Story:** As a business owner, I want advanced reporting backend APIs so that I can access comprehensive business analytics and insights.

#### Acceptance Criteria

1. WHEN generating reports THEN the API SHALL provide endpoints for sales trends by daily, weekly, and monthly periods
2. WHEN analyzing performance THEN the API SHALL provide profit & loss breakdown by category with detailed calculations
3. WHEN identifying top performers THEN the API SHALL provide endpoints for best-selling products and highest value customers
4. WHEN managing collections THEN the API SHALL provide accounts receivable aging report with overdue analysis
5. WHEN calculating metrics THEN the API SHALL provide business KPIs like revenue growth, customer acquisition, and retention
6. WHEN generating insights THEN the API SHALL provide AI-driven analysis endpoints with plain language summaries
7. WHEN creating alerts THEN the API SHALL provide endpoints for overdue payments and upcoming installment notifications
8. WHEN exporting data THEN the API SHALL provide report export endpoints in CSV, PDF, and JSON formats
9. WHEN filtering reports THEN the API SHALL accept date ranges, customer filters, and product category filters

### Requirement 21: Tenant Application - Advanced Reporting Frontend

**User Story:** As a business owner, I want interactive reporting interfaces so that I can visualize and analyze my business data effectively.

#### Acceptance Criteria

1. WHEN viewing reports THEN the frontend SHALL display interactive charts using Chart.js or ECharts with Persian labels
2. WHEN analyzing sales THEN the frontend SHALL show sales trend charts with daily, weekly, and monthly toggle options
3. WHEN reviewing performance THEN the frontend SHALL display profit & loss charts with category breakdowns and drill-down capability
4. WHEN identifying opportunities THEN the frontend SHALL show best-selling products and highest value customers in visual dashboards
5. WHEN managing collections THEN the frontend SHALL display accounts receivable aging report with color-coded overdue indicators
6. WHEN viewing main dashboard THEN the frontend SHALL display "Business Insights" widget with AI-driven analysis in Persian
7. WHEN alerts are triggered THEN the frontend SHALL show notification badges and alert panels for overdue payments
8. WHEN exporting reports THEN the frontend SHALL provide export buttons for PDF, CSV, and print options
9. WHEN filtering data THEN the frontend SHALL provide date range pickers, customer selectors, and category filters

### Requirement 22: Tenant Application - Notification System Backend

**User Story:** As a business owner, I want automated notification backend APIs so that I can maintain good customer relationships and improve payment collections.

#### Acceptance Criteria

1. WHEN invoice is created THEN the API SHALL trigger Celery task to send invoice to customer via email automatically
2. WHEN payment is received THEN the API SHALL trigger Celery task to send thank you/receipt message
3. WHEN installment is due THEN the API SHALL trigger Celery task to send reminder SMS/email few days before due date
4. WHEN payment is overdue THEN the API SHALL trigger Celery tasks to send reminders at 3, 15, and 30 days late
5. WHEN manual reminder is requested THEN the API SHALL provide endpoint to send reminder for any unpaid invoice
6. WHEN marketing campaign is needed THEN the API SHALL provide endpoint to send promotional SMS to tagged customer groups
7. WHEN notifications are processed THEN the API SHALL use Celery workers for asynchronous email and SMS delivery
8. WHEN notification status is needed THEN the API SHALL provide endpoints to track delivery status and failures
9. WHEN configuring notifications THEN the API SHALL provide endpoints to manage email templates and SMS templates

### Requirement 23: Tenant Application - Notification System Frontend

**User Story:** As a business owner, I want notification management interfaces so that I can control and monitor customer communications.

#### Acceptance Criteria

1. WHEN managing notifications THEN the frontend SHALL provide notification settings interface for email and SMS preferences
2. WHEN viewing notification history THEN the frontend SHALL display sent notifications with delivery status and timestamps
3. WHEN sending manual reminders THEN the frontend SHALL provide "Send Reminder" button on unpaid invoices
4. WHEN creating marketing campaigns THEN the frontend SHALL provide SMS campaign interface with customer group selection
5. WHEN configuring templates THEN the frontend SHALL provide email and SMS template editor with Persian support
6. WHEN monitoring delivery THEN the frontend SHALL show notification delivery status with success/failure indicators
7. WHEN managing customer preferences THEN the frontend SHALL provide interface for customers to opt-in/out of notifications
8. WHEN scheduling notifications THEN the frontend SHALL provide interface to configure automatic reminder schedules

### Requirement 24: Tenant Application - Inventory Management Backend

**User Story:** As a business owner, I want inventory management backend APIs so that I can track products, categories, and stock levels.

#### Acceptance Criteria

1. WHEN managing products THEN the API SHALL provide CRUD endpoints for products with categories, descriptions, and pricing
2. WHEN tracking inventory THEN the API SHALL provide endpoints for stock levels, stock movements, and low stock alerts
3. WHEN organizing products THEN the API SHALL provide endpoints for product categories and subcategories
4. WHEN uploading images THEN the API SHALL automatically resize, convert to WebP, and compress using Celery workers
5. WHEN searching products THEN the API SHALL provide search endpoints with filters for category, price range, and stock status
6. WHEN managing variants THEN the API SHALL support product variants with different prices and stock levels
7. WHEN calculating costs THEN the API SHALL provide endpoints for cost tracking and profit margin calculations

### Requirement 25: Tenant Application - Inventory Management Frontend

**User Story:** As a business owner, I want inventory management interfaces so that I can easily manage my products and stock.

#### Acceptance Criteria

1. WHEN managing products THEN the frontend SHALL provide product management interface with image upload and category selection
2. WHEN viewing inventory THEN the frontend SHALL display product list with stock levels, categories, and search functionality
3. WHEN organizing products THEN the frontend SHALL provide category management interface with drag-and-drop organization
4. WHEN tracking stock THEN the frontend SHALL show stock levels, low stock alerts, and inventory movement history
5. WHEN uploading images THEN the frontend SHALL provide drag-and-drop image upload with preview and optimization
6. WHEN searching products THEN the frontend SHALL provide advanced search with filters for category, price, and stock status
7. WHEN managing variants THEN the frontend SHALL provide product variant management with different prices and stock levels

### Requirement 26: Super Admin Platform - Authentication Interface

**User Story:** As a platform owner, I want a secure Super Admin login interface so that I can access the platform management dashboard with proper authentication.

#### Acceptance Criteria

1. WHEN accessing Super Admin application THEN the system SHALL display a dedicated login page with gradient design
2. WHEN entering credentials THEN the system SHALL validate Super Admin email and password against secure authentication
3. WHEN authentication succeeds THEN the system SHALL generate Super Admin JWT token with special claims
4. WHEN authentication fails THEN the system SHALL display clear error messages and security logging
5. WHEN logged in THEN the system SHALL redirect to Super Admin dashboard with full platform access
6. WHEN session expires THEN the system SHALL automatically redirect to login page with session timeout message
7. WHEN logging out THEN the system SHALL invalidate JWT token and redirect to login page
8. WHEN accessing protected routes THEN the system SHALL verify Super Admin authentication and redirect if unauthorized

### Requirement 27: Tenant Application - Authentication Interface

**User Story:** As a business owner, I want a secure tenant login interface so that I can access my business management dashboard with proper authentication and subscription validation.

#### Acceptance Criteria

1. WHEN accessing Tenant application THEN the system SHALL display a dedicated login page with gradient design and Persian RTL support
2. WHEN entering credentials THEN the system SHALL validate tenant user email and password with tenant context
3. WHEN authentication succeeds THEN the system SHALL generate tenant JWT token with tenant_id and user role claims
4. WHEN authentication fails THEN the system SHALL display clear error messages in Persian with security logging
5. WHEN logged in THEN the system SHALL redirect to tenant dashboard with subscription-based feature access
6. WHEN subscription is expired THEN the system SHALL display subscription renewal notice and limit access to paid features
7. WHEN subscription is Free tier THEN the system SHALL display usage limits and upgrade prompts when approaching limits
8. WHEN session expires THEN the system SHALL automatically redirect to login page with session timeout message in Persian
9. WHEN logging out THEN the system SHALL invalidate JWT token and redirect to login page
10. WHEN accessing protected routes THEN the system SHALL verify tenant authentication and subscription status stock movement history and low stock alerts with visual indicators
5. WHEN uploading images THEN the frontend SHALL provide drag-and-drop image upload with preview and optimization status
6. WHEN managing variants THEN the frontend SHALL provide product variant interface for different sizes, colors, or specifications
7. WHEN analyzing inventory THEN the frontend SHALL show inventory reports with stock valuation and turnover metrics

### Requirement 26: Tenant Application - CRM and Customer Management Backend

**User Story:** As a business owner, I want CRM backend APIs so that I can manage customer relationships and contact information.

#### Acceptance Criteria

1. WHEN managing customers THEN the API SHALL provide CRUD endpoints for customer profiles with contact information
2. WHEN tracking interactions THEN the API SHALL provide endpoints for customer interaction history and notes
3. WHEN segmenting customers THEN the API SHALL provide endpoints for customer tags and grouping
4. WHEN analyzing customers THEN the API SHALL provide endpoints for customer lifetime value and purchase history
5. WHEN managing communications THEN the API SHALL provide endpoints for customer communication preferences
6. WHEN tracking debts THEN the API SHALL provide endpoints for customer outstanding balances and payment history
7. WHEN exporting data THEN the API SHALL provide endpoints to export customer data in CSV/JSON formats

### Requirement 27: Tenant Application - CRM and Customer Management Frontend

**User Story:** As a business owner, I want CRM interfaces so that I can easily manage customer relationships and track interactions.

#### Acceptance Criteria

1. WHEN managing customers THEN the frontend SHALL provide customer management interface with contact forms and search
2. WHEN viewing customer details THEN the frontend SHALL display customer profile with interaction history and outstanding balances
3. WHEN tracking interactions THEN the frontend SHALL provide interface to add notes, calls, and meeting records
4. WHEN segmenting customers THEN the frontend SHALL provide customer tagging interface with group management
5. WHEN analyzing relationships THEN the frontend SHALL show customer analytics with purchase patterns and value metrics
6. WHEN communicating THEN the frontend SHALL provide quick communication tools integrated with notification system
7. WHEN managing debts THEN the frontend SHALL display customer debt summary with installment tracking

### Requirement 28: Tenant Application - User Management and Permissions Backend

**User Story:** As a business owner, I want user management backend APIs so that I can control access and permissions for my team members.

#### Acceptance Criteria

1. WHEN managing users THEN the API SHALL provide endpoints for tenant-level user creation, editing, and deactivation
2. WHEN setting permissions THEN the API SHALL provide role-based permission system with granular access control
3. WHEN authenticating users THEN the API SHALL validate user permissions for each endpoint based on their role
4. WHEN tracking activity THEN the API SHALL provide endpoints for user activity logs and session management
5. WHEN managing roles THEN the API SHALL provide endpoints for custom role creation with permission assignment
6. WHEN enforcing limits THEN the API SHALL enforce subscription-based user limits (1 for Free, 5 for Pro)
7. WHEN validating access THEN the API SHALL check both tenant membership and role permissions for all operations

### Requirement 29: Tenant Application - User Management and Permissions Frontend

**User Story:** As a business owner, I want user management interfaces so that I can easily manage my team's access and permissions.

#### Acceptance Criteria

1. WHEN managing team THEN the frontend SHALL provide user management interface with role assignment and status control
2. WHEN setting permissions THEN the frontend SHALL provide role management interface with permission checkboxes
3. WHEN viewing activity THEN the frontend SHALL display user activity logs with filtering and search capabilities
4. WHEN inviting users THEN the frontend SHALL provide user invitation interface with role pre-selection
5. WHEN managing sessions THEN the frontend SHALL show active user sessions with ability to terminate sessions
6. WHEN approaching limits THEN the frontend SHALL show user count against subscription limits with upgrade prompts
7. WHEN configuring access THEN the frontend SHALL provide granular permission settings for different business functions

### Requirement 30: Tenant Application - QR Code and Invoice Sharing Backend

**User Story:** As a business owner, I want QR code and invoice sharing backend APIs so that I can easily share invoices with customers.

#### Acceptance Criteria

1. WHEN creating invoices THEN the API SHALL automatically generate QR codes linking to secure read-only web versions
2. WHEN generating QR codes THEN the API SHALL create unique, secure URLs for each invoice with expiration options
3. WHEN accessing shared invoices THEN the API SHALL provide public endpoints for read-only invoice viewing without authentication
4. WHEN validating access THEN the API SHALL verify QR code tokens and ensure invoice belongs to correct tenant
5. WHEN tracking views THEN the API SHALL log invoice view attempts with timestamps and IP addresses
6. WHEN generating PDFs THEN the API SHALL create PDF invoices with embedded QR codes using Celery workers
7. WHEN managing sharing THEN the API SHALL provide endpoints to enable/disable invoice sharing per invoice

### Requirement 31: Tenant Application - QR Code and Invoice Sharing Frontend

**User Story:** As a business owner, I want QR code and invoice sharing interfaces so that I can easily share professional invoices with customers.

#### Acceptance Criteria

1. WHEN viewing invoices THEN the frontend SHALL display QR codes prominently on invoice details and print layouts
2. WHEN sharing invoices THEN the frontend SHALL provide share buttons with QR code display and copy link functionality
3. WHEN accessing shared invoices THEN the frontend SHALL provide clean, professional read-only invoice view for customers
4. WHEN printing invoices THEN the frontend SHALL include QR codes in PDF exports and print layouts
5. WHEN managing sharing THEN the frontend SHALL provide toggle switches to enable/disable sharing per invoice
6. WHEN tracking access THEN the frontend SHALL show invoice view statistics and access logs
7. WHEN customizing sharing THEN the frontend SHALL provide options for QR code size and placement on invoices

### Requirement 32: Comprehensive Backup and Recovery System Backend

**User Story:** As a platform owner and business owner, I want a comprehensive backup and recovery system so that I can protect tenant data, enable disaster recovery, and allow customers to backup their own data.

#### Acceptance Criteria

1. WHEN performing individual tenant backup THEN the API SHALL create encrypted SQL dumps for specific tenants with all related data
2. WHEN uploading tenant backups THEN the API SHALL store backups on both Backblaze B2 (primary) and Cloudflare R2 (secondary) with dual redundancy
3. WHEN restoring tenant data THEN the API SHALL provide endpoints to restore individual tenants, multiple tenants, or all tenants with storage provider selection
4. WHEN performing disaster recovery backup THEN the API SHALL create nightly full PostgreSQL dumps and container configuration backups
5. WHEN storing disaster backups THEN the API SHALL upload full platform backups to both cloud storage providers with encryption
6. WHEN enabling customer self-backup THEN the API SHALL provide endpoints for customers to generate local-only backups once daily
7. WHEN validating backups THEN the API SHALL verify backup integrity, encryption, and successful cloud storage uploads
8. WHEN managing storage THEN the API SHALL provide endpoints to monitor storage usage, costs, and backup retention policies
9. WHEN tracking backup operations THEN the API SHALL log all backup and restore activities with detailed audit trails
10. WHEN configuring storage THEN the API SHALL support Backblaze B2 credentials (B2_BUCKET_NAME="securesyntax", B2_ENDPOINT_URL="https://s3.us-east-005.backblaze2.com") and Cloudflare R2 configuration

### Requirement 33: Comprehensive Backup and Recovery System Frontend

**User Story:** As a platform owner and business owner, I want comprehensive backup and recovery interfaces so that I can manage all backup operations through intuitive dashboards.

#### Acceptance Criteria

1. WHEN managing tenant backups THEN the Super Admin frontend SHALL provide tenant backup/restore interface with provider selection and flexible restore options
2. WHEN monitoring disaster recovery THEN the Super Admin frontend SHALL display disaster recovery dashboard with full platform backup status and restore capabilities
3. WHEN viewing backup storage THEN the Super Admin frontend SHALL show storage usage analytics for both Backblaze B2 and Cloudflare R2 with cost monitoring
4. WHEN performing customer backup THEN the Tenant Application frontend SHALL provide customer self-backup interface with daily limit enforcement and local download
5. WHEN verifying backups THEN both frontends SHALL display backup integrity status, verification results, and backup history
6. WHEN selecting restore options THEN the Super Admin frontend SHALL provide confirmation workflows for individual, multiple, or full tenant restoration
7. WHEN monitoring backup operations THEN both frontends SHALL show real-time backup progress, completion status, and error notifications
8. WHEN managing backup policies THEN the Super Admin frontend SHALL provide retention policy configuration and automated cleanup settings
9. WHEN accessing backup history THEN both frontends SHALL display comprehensive backup logs with filtering, search, and audit trail capabilities
10. WHEN handling backup errors THEN both frontends SHALL provide clear error messages, retry options, and troubleshooting guidance

### Requirement 34: Technology Stack and Deployment Infrastructure

**User Story:** As a platform owner, I want a modern, scalable technology stack so that the platform can handle growth and provide excellent performance.

#### Acceptance Criteria

1. WHEN deploying backend THEN the system SHALL use Python 3.11+, FastAPI, PostgreSQL, Redis, and Celery in Docker containers
2. WHEN deploying frontend THEN the system SHALL use React with Vite, TypeScript, Tailwind CSS, and shadcn/ui in Docker containers
3. WHEN storing backups THEN the system SHALL use Backblaze B2 as primary and Cloudflare R2 as secondary storage with dual redundancy for maximum data protection
4. WHEN deploying application THEN the system SHALL be fully containerized using Docker and Docker Compose with multi-service orchestration
5. WHEN running in production THEN all components SHALL run in separate Docker containers with proper networking and volume management
6. WHEN scaling is needed THEN the system SHALL support horizontal scaling through container orchestration and load balancing
7. WHEN configuring services THEN the system SHALL use environment variables for all configuration including database connections and API keys
8. WHEN managing dependencies THEN the system SHALL use requirements.txt for Python and package.json for Node.js with version pinning

### Requirement 35: UI Design System Integration for Both Applications

**User Story:** As a user, I want a beautiful, consistent, and professional interface so that both Super Admin and Tenant applications are pleasant to use and reflect quality.

#### Acceptance Criteria

1. WHEN viewing any page THEN both applications SHALL use gradient backgrounds and modern card layouts from ui.md design system
2. WHEN interacting with buttons THEN both applications SHALL provide gradient button variants with hover effects and shadow transitions
3. WHEN viewing cards THEN both applications SHALL use shadow effects and gradient backgrounds with consistent spacing
4. WHEN navigating THEN both applications SHALL provide modern pill-style tabs with gradient backgrounds and active states
5. WHEN using forms THEN both applications SHALL provide enhanced focus states with gradient ring effects and smooth transitions
6. WHEN viewing data THEN both applications SHALL use gradient header backgrounds for tables with consistent typography
7. WHEN using the interface THEN both applications SHALL support Persian (RTL) layout and typography with proper text alignment
8. WHEN accessing on mobile THEN both applications SHALL provide responsive design across all breakpoints with touch-friendly interactions
9. WHEN loading content THEN both applications SHALL use consistent loading states with gradient shimmer effects
10. WHEN displaying errors THEN both applications SHALL use consistent error styling with gradient accent colors

### Requirement 36: Testing and Quality Assurance

**User Story:** As a platform owner, I want comprehensive testing coverage so that the platform is reliable and bug-free.

#### Acceptance Criteria

1. WHEN developing backend APIs THEN the system SHALL include unit tests for all API endpoints with real database testing
2. WHEN developing frontend components THEN the system SHALL include component tests for all UI components and user interactions
3. WHEN testing integrations THEN the system SHALL include integration tests between frontend and backend with real API calls
4. WHEN testing database operations THEN the system SHALL use test database with real data scenarios for comprehensive testing
5. WHEN testing multi-tenancy THEN the system SHALL verify data isolation between tenants in all test scenarios
6. WHEN testing authentication THEN the system SHALL verify JWT token handling, permissions, and security measures
7. WHEN testing async operations THEN the system SHALL verify Celery task execution, email sending, and notification delivery
8. WHEN testing backups THEN the system SHALL verify backup creation, encryption, upload to both storage providers, and restore procedures
9. WHEN running tests THEN all tests SHALL pass before any deployment or code merge
10. WHEN testing performance THEN the system SHALL include load testing for critical endpoints and database operations
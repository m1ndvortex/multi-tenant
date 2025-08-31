-- Initialize HesaabPlus Database
-- This script sets up the initial database configuration

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('general', 'gold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE installment_type AS ENUM ('none', 'general', 'gold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_type AS ENUM ('free', 'pro', 'pending_payment', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
-- These will be created by Alembic migrations, but we prepare the database

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;
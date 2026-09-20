-- ============================================================================
-- LEADYFY OS — UNIFIED PRODUCTION MASTER DATABASE SCHEMA
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'employee', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE employee_sub_role AS ENUM ('sales', 'script_writer', 'shoot_manager', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('lead', 'new', 'onboarding', 'active', 'on_hold', 'completed', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('new', 'onboarding', 'in_production', 'partially_delivered', 'completed', 'on_hold', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE script_status AS ENUM ('draft', 'assigned', 'in_review', 'approved', 'sent_to_client', 'revision_required', 'ready_for_shoot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE creator_availability_status AS ENUM ('available', 'booked', 'unavailable', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE shoot_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'reshoot_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE video_pipeline_status AS ENUM (
        'script_approved',
        'shoot_pending',
        'raw_footage_received',
        'video_editing',
        'internal_qa',
        'client_review',
        'revision',
        'final_approved',
        'delivered'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM ('salaries', 'office', 'studio', 'equipment', 'fuel', 'payouts', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- BETTER AUTH TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    client_id UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    "scope" TEXT,
    password TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    changed_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    old_role TEXT,
    new_role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 1. USERS & RBAC (Agency Staff & Portal Users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. EMPLOYEES
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    sub_role employee_sub_role NOT NULL,
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CLIENTS (Normalized company_name schema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    client_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    brand_name VARCHAR(150),
    industry VARCHAR(100),
    gst_tax_id VARCHAR(50),
    assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    source VARCHAR(100),
    brand_kit_assets JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    status client_status NOT NULL DEFAULT 'lead',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist if table was already created
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. COMMERCIAL SERVICE PACKAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    video_count INTEGER NOT NULL DEFAULT 1,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- 5. ORDERS & COMMITMENTS (Includes Live Production Counters)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    package_name VARCHAR(150) NOT NULL,
    package_name_snapshot VARCHAR(255),
    contracted_video_count INT NOT NULL CHECK (contracted_video_count > 0),
    pricing NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gst_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    total_invoice_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    outstanding_balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_invoice_amount - amount_received) STORED,
    assigned_team_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status order_status NOT NULL DEFAULT 'new',
    notes TEXT,
    
    -- Live Production Counters
    ordered_videos_quota INT NOT NULL DEFAULT 0,
    assigned_videos INT NOT NULL DEFAULT 0,
    completed_videos INT NOT NULL DEFAULT 0,
    delivered_videos INT NOT NULL DEFAULT 0,
    remaining_quota INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. CREATORS & CREATOR AVAILABILITY
-- ============================================================================
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    photo_url TEXT,
    gender VARCHAR(30),
    age_group VARCHAR(30),
    languages TEXT[] DEFAULT ARRAY[]::TEXT[],
    location VARCHAR(150),
    niches TEXT[] DEFAULT ARRAY[]::TEXT[],
    demographics JSONB DEFAULT '{}'::jsonb,
    contact_phone VARCHAR(30),
    contact_email VARCHAR(255),
    standard_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bank_upi_info JSONB DEFAULT '{}'::jsonb,
    portfolio_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status creator_availability_status NOT NULL DEFAULT 'available',
    notes TEXT,
    UNIQUE (creator_id, date)
);

-- ============================================================================
-- 7. SCRIPTS (Manual script flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    video_number INT NOT NULL,
    writer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    language VARCHAR(50) NOT NULL DEFAULT 'English',
    script_text TEXT NOT NULL,
    reference_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    deadline TIMESTAMPTZ,
    revision_count INT NOT NULL DEFAULT 0,
    status script_status NOT NULL DEFAULT 'draft',
    client_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. SHOOTS (Calendar & Logistics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shoots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    cameraman_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    shoot_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    shooting_assistant_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    approved_script_ids UUID[] DEFAULT ARRAY[]::UUID[],
    special_notes TEXT,
    status shoot_status NOT NULL DEFAULT 'scheduled',

    -- Pre-Shoot Checklist
    pre_script_approved BOOLEAN NOT NULL DEFAULT FALSE,
    pre_creator_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    pre_location_permissions BOOLEAN NOT NULL DEFAULT FALSE,
    pre_client_product_received BOOLEAN NOT NULL DEFAULT FALSE,
    pre_team_briefed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Post-Shoot Verification
    post_footage_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
    post_raw_file_integrity BOOLEAN NOT NULL DEFAULT FALSE,
    post_reshoot_flagged BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. VIDEOS (9-Stage Linear Pipeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    shoot_id UUID REFERENCES shoots(id) ON DELETE SET NULL,
    assigned_editor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    pipeline_status video_pipeline_status NOT NULL DEFAULT 'script_approved',
    deadline TIMESTAMPTZ,
    video_drive_url TEXT,
    thumbnail_url TEXT,
    revision_count INT NOT NULL DEFAULT 0,
    final_delivery_link TEXT,
    approved_by_client_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. VIDEO FEEDBACK (Timestamped reviews)
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp_seconds INT,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. FINANCIAL LEDGER: PAYMENTS (Client Receivables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_amount NUMERIC(12, 2) NOT NULL,
    amount_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_balance NUMERIC(12, 2) GENERATED ALWAYS AS (invoice_amount - amount_received) STORED,
    payment_date TIMESTAMPTZ,
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    status payment_status NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. FINANCIAL LEDGER: AGENCY EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category expense_category NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    logged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_file_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. FINANCIAL LEDGER: CREATOR PAYOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS creator_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shoot_id UUID REFERENCES shoots(id) ON DELETE SET NULL,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    video_count INT NOT NULL DEFAULT 1,
    contracted_rate NUMERIC(10, 2) NOT NULL,
    total_payout NUMERIC(12, 2) NOT NULL,
    payment_date TIMESTAMPTZ,
    transaction_reference VARCHAR(100),
    status payout_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_shoot_payout UNIQUE (creator_id, shoot_id),
    CONSTRAINT unique_video_payout UNIQUE (creator_id, video_id)
);

-- ============================================================================
-- 14. OPERATIONAL TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'todo',
    deadline TIMESTAMPTZ,
    attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 15. SUPPORT TICKETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 16. NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 17. ACTIVITY LOGS (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id UUID,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 18. DIGITAL ASSETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATION: LIVE PRODUCTION COUNTERS TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_init_order_counters()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ordered_videos_quota := NEW.contracted_video_count;
    NEW.remaining_quota := NEW.contracted_video_count;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_order_counters ON orders;
CREATE TRIGGER trg_init_order_counters
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION fn_init_order_counters();

CREATE OR REPLACE FUNCTION fn_update_video_order_counters()
RETURNS TRIGGER AS $$
DECLARE
    target_order_id UUID;
BEGIN
    target_order_id := COALESCE(NEW.order_id, OLD.order_id);

    UPDATE orders
    SET 
        assigned_videos = (
            SELECT COUNT(*) FROM videos WHERE order_id = target_order_id AND assigned_editor_id IS NOT NULL
        ),
        completed_videos = (
            SELECT COUNT(*) FROM videos WHERE order_id = target_order_id AND pipeline_status IN ('final_approved', 'delivered')
        ),
        delivered_videos = (
            SELECT COUNT(*) FROM videos WHERE order_id = target_order_id AND pipeline_status = 'delivered'
        ),
        remaining_quota = ordered_videos_quota - (
            SELECT COUNT(*) FROM videos WHERE order_id = target_order_id AND pipeline_status = 'delivered'
        ),
        updated_at = NOW()
    WHERE id = target_order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_video_order_counters ON videos;
CREATE TRIGGER trg_update_video_order_counters
AFTER INSERT OR UPDATE OR DELETE ON videos
FOR EACH ROW
EXECUTE FUNCTION fn_update_video_order_counters();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"(token);
CREATE INDEX IF NOT EXISTS "idx_session_userId" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_userId" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"(identifier);
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "user"(role);
CREATE INDEX IF NOT EXISTS "idx_user_client_id" ON "user"(client_id);
CREATE INDEX IF NOT EXISTS "idx_role_audit_logs_target_user" ON role_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_packages_org_active ON packages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON clients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_client ON orders(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_scripts_order_id ON scripts(order_id);
CREATE INDEX IF NOT EXISTS idx_shoots_creator_id ON shoots(creator_id);
CREATE INDEX IF NOT EXISTS idx_shoots_scheduled_start ON shoots(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_videos_order_id ON videos(order_id);
CREATE INDEX IF NOT EXISTS idx_videos_assigned_editor ON videos(assigned_editor_id);
CREATE INDEX IF NOT EXISTS idx_videos_pipeline_status ON videos(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ============================================================================
-- SEED INITIAL PACKAGES
-- ============================================================================
INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT '11111111-1111-1111-1111-111111111101'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'UGC Starter', 'Ideal for emerging direct-to-consumer brands looking for high-converting hook tests.', 10, 25000.00, 18.00, true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Starter');

INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT '11111111-1111-1111-1111-111111111102'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'UGC Growth', 'Comprehensive monthly creative testing bundle with multiple creator personas and angles.', 20, 45000.00, 18.00, true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Growth');

INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT '11111111-1111-1111-1111-111111111103'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'UGC Pro Scale', 'High-volume creative production for scaled paid media operations with fast turnaround.', 50, 90000.00, 18.00, true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Pro Scale');

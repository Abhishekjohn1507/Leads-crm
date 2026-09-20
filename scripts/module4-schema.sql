-- LEADYFY OS — Module 4: Client & Package / Order Management Schema Migration

-- 1. Ensure packages table exists
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

-- 2. Extend clients table with organization_id and notes if missing
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 3. Extend orders table with organization_id and package_id if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_name_snapshot VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 18.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Create Indexes for High Performance & Organization Scoping
CREATE INDEX IF NOT EXISTS idx_packages_org_active ON packages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON clients(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_client ON orders(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- 5. Seed initial packages if none exist
INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT 
    '11111111-1111-1111-1111-111111111101'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'UGC Starter',
    'Ideal for emerging direct-to-consumer brands looking for high-converting hook tests.',
    10,
    25000.00,
    18.00,
    true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Starter');

INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT 
    '11111111-1111-1111-1111-111111111102'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'UGC Growth',
    'Comprehensive monthly creative testing bundle with multiple creator personas and angles.',
    20,
    45000.00,
    18.00,
    true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Growth');

INSERT INTO packages (id, organization_id, name, description, video_count, base_price, tax_rate, is_active)
SELECT 
    '11111111-1111-1111-1111-111111111103'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'UGC Pro Scale',
    'High-volume creative production for scaled paid media operations with fast turnaround.',
    50,
    90000.00,
    18.00,
    true
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'UGC Pro Scale');

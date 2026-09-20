-- Client Video Requests / Creative Briefs Schema

CREATE TABLE IF NOT EXISTS video_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    requested_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    hook_angle TEXT,
    core_message TEXT,
    target_audience TEXT,
    reference_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_requests_order ON video_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_video_requests_client ON video_requests(client_id);

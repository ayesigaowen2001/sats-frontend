CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE organizations (
    organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    country VARCHAR(100),
    domain VARCHAR(255) UNIQUE,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'Active' CHECK (subscription_status IN ('Active', 'Trial', 'Expired', 'Suspended')),
    subscription_expiry DATE,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    secondary_color VARCHAR(7),
    accent_color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Locked')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_admin_users (
    system_user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Locked')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name VARCHAR(50) NOT NULL,
    max_animals INTEGER,
    max_devices INTEGER,
    max_users INTEGER,
    max_nodes INTEGER,
    data_retention_months INTEGER,
    video_enabled BOOLEAN DEFAULT FALSE,
    ai_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE org_subscriptions (
    sub_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(plan_id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start DATE,
    current_period_end DATE,
    created_by UUID REFERENCES system_admin_users(system_user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE org_branding (
    branding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) UNIQUE,
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    accent_color VARCHAR(7),
    logo_url TEXT,
    logo_url_64 TEXT,
    logo_url_128 TEXT,
    favicon_url TEXT,
    font_family VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE local_nodes (
    node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    service_account_id UUID REFERENCES users(user_id),
    node_name VARCHAR(100) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    software_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'offline', 'syncing', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    system_user_id UUID REFERENCES system_admin_users(system_user_id),
    organization_id UUID REFERENCES organizations(organization_id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE device_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_specifications (
    spec_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES device_categories(category_id),
    gps_model VARCHAR(100),
    communication_type VARCHAR(50) CHECK (communication_type IN ('LoRa', 'GSM', 'Satellite', 'Hybrid')),
    battery_type VARCHAR(100),
    camera_enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensors (
    sensor_id SERIAL PRIMARY KEY,
    sensor_name VARCHAR(100) NOT NULL UNIQUE,
    unit VARCHAR(50),
    description TEXT
);

CREATE TABLE device_sensors (
    device_spec_id INTEGER NOT NULL REFERENCES device_specifications(spec_id) ON DELETE CASCADE,
    sensor_id INTEGER NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    PRIMARY KEY (device_spec_id, sensor_id)
);

CREATE TABLE devices (
    device_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES device_categories(category_id),
    spec_id INTEGER REFERENCES device_specifications(spec_id),
    device_serial VARCHAR(100) UNIQUE NOT NULL,
    firmware_version VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Inactive' CHECK (status IN ('Active', 'Inactive', 'Faulty', 'Maintenance', 'Retired')),
    last_seen_at TIMESTAMP WITH TIME ZONE,
    battery_percentage DECIMAL(5,2),
    battery_voltage DECIMAL(6,3),
    power_consumption_rate DECIMAL(8,4),
    last_charge_date DATE,
    low_battery_alert_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE animal_classifications (
    classification_id SERIAL PRIMARY KEY,
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    kingdom VARCHAR(100),
    phylum VARCHAR(100),
    class_name VARCHAR(100),
    order_name VARCHAR(100),
    family VARCHAR(150),
    genus VARCHAR(150),
    species VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    conservation_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, species)
);

CREATE TABLE animals (
    animal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    classification_id INTEGER REFERENCES animal_classifications(classification_id),
    animal_number VARCHAR(100) NOT NULL,
    common_name VARCHAR(255),
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Unknown')),
    age INTEGER CHECK (age >= 0),
    weight_kg DECIMAL(6,2) CHECK (weight_kg > 0),
    date_tagged DATE,
    location_tagged GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, animal_number)
);

CREATE TABLE device_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    animal_id UUID NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE tracking_logs (
    log_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(device_id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh DECIMAL(6,2),
    direction_degrees DECIMAL(5,2),
    altitude_m DECIMAL(7,2),
    accuracy_m DECIMAL(6,2),
    geostatus VARCHAR(20) CHECK (geostatus IN ('Inside', 'Outside', 'Border', 'Breach')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE health_logs (
    health_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(device_id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    heart_rate_bpm INTEGER,
    body_temperature_c DECIMAL(5,2),
    oxygen_level_spo2 DECIMAL(5,2),
    activity_level INTEGER CHECK (activity_level BETWEEN 0 AND 100),
    additional_sensors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (health_id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE battery_logs (
    battery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    battery_percentage DECIMAL(5,2) CHECK (battery_percentage BETWEEN 0 AND 100),
    battery_voltage DECIMAL(6,3),
    power_consumption_rate DECIMAL(8,4),
    low_battery_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_health_predictions (
    prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    health_status VARCHAR(30) CHECK (health_status IN ('Normal', 'At Risk', 'Critical')),
    confidence_score DECIMAL(5,4),
    detected_issue TEXT,
    model_version VARCHAR(50),
    raw_features JSONB
);

CREATE TABLE geofences (
    geofence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    park_name VARCHAR(255) NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE geofence_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES animals(animal_id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES geofences(geofence_id),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) CHECK (status IN ('Inside', 'Outside', 'Border', 'Breach')),
    location GEOGRAPHY(POINT, 4326)
);

CREATE TABLE cameras (
    camera_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES devices(device_id),
    camera_name VARCHAR(255),
    stream_url TEXT,
    geo_coordinates GEOGRAPHY(POINT, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_clips (
    clip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID REFERENCES cameras(camera_id),
    animal_id UUID REFERENCES animals(animal_id),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    video_path TEXT,
    activity_detected TEXT,
    duration_seconds INTEGER,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6)
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Health Alert', 'Geofence Alert', 'Device Alert', 'Info', 'Warning')),
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Unread' CHECK (status IN ('Unread', 'Read'))
);

CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    generated_by UUID REFERENCES users(user_id),
    report_type VARCHAR(100),
    date_from DATE,
    date_to DATE,
    format VARCHAR(20) CHECK (format IN ('PDF', 'CSV', 'Excel')),
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    source_file_name TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    validation_errors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_animals_location_gist ON animals USING GIST (location_tagged);
CREATE INDEX idx_tracking_location_gist ON tracking_logs USING GIST (location);
CREATE INDEX idx_tracking_animal_time ON tracking_logs (animal_id, recorded_at DESC);
CREATE INDEX idx_health_animal_time ON health_logs (animal_id, recorded_at DESC);
CREATE INDEX idx_geofences_boundary_gist ON geofences USING GIST (boundary);
CREATE INDEX idx_audit_log_occurred_at ON audit_log (occurred_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON devices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_animals_updated_at BEFORE UPDATE ON animals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_org_branding_updated_at BEFORE UPDATE ON org_branding
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
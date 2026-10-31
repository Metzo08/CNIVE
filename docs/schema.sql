-- CNIVE PostgreSQL Schema

-- Enable PostGIS for mapping if needed (optional but recommended for GeoJSON/GIS)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enumerations
CREATE TYPE user_role AS ENUM ('GTE_ADMIN', 'SCHOOL_DIRECTOR', 'SOCIAL_WORKER', 'HEALTH_WORKER', 'TEACHER');
CREATE TYPE pupil_status AS ENUM ('ACTIVE', 'TRANSFERRED', 'DROPOUT');
CREATE TYPE vulnerability_level AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE card_status AS ENUM ('PENDING', 'ACTIVE', 'LOST', 'STOLEN', 'DEFECTIVE');
CREATE TYPE intervention_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Organizations / Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE, -- e.g., ECOPN, EDEN
    address TEXT,
    city VARCHAR(100) DEFAULT 'Pikine',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL,
    school_id UUID REFERENCES schools(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pupils
CREATE TABLE pupils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Logical ID (e.g., CNIVE-2026-XXXXX) stored separately or derived
    cnive_id VARCHAR(20) UNIQUE, 
    school_id UUID REFERENCES schools(id) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    photo_url TEXT,
    national_id VARCHAR(50),
    address TEXT,
    contact_parent1_name VARCHAR(255),
    contact_parent1_phone VARCHAR(50),
    contact_parent2_name VARCHAR(255),
    contact_parent2_phone VARCHAR(50),
    status pupil_status DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Digital Health Records (DSN)
CREATE TABLE health_records (
    pupil_id UUID PRIMARY KEY REFERENCES pupils(id) ON DELETE CASCADE,
    blood_type VARCHAR(5),
    allergies TEXT,
    medical_history TEXT,
    cmu_enrolled BOOLEAN DEFAULT FALSE,
    cmu_number VARCHAR(50),
    reference_health_center VARCHAR(255),
    last_checkup TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerability Assessments
CREATE TABLE vulnerability_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID REFERENCES pupils(id) ON DELETE CASCADE,
    assessor_id UUID REFERENCES users(id),
    economic_score INT DEFAULT 0, -- 0-3 according to severity
    school_score INT DEFAULT 0,
    health_score INT DEFAULT 0,
    social_score INT DEFAULT 0,
    violence_score INT DEFAULT 0,
    total_score FLOAT DEFAULT 0,
    classification vulnerability_level DEFAULT 'LOW',
    comments TEXT,
    assessment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cards (QR/NFC)
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID REFERENCES pupils(id) ON DELETE CASCADE,
    qr_token VARCHAR(255) UNIQUE NOT NULL,
    nfc_uid VARCHAR(255) UNIQUE,
    status card_status DEFAULT 'PENDING',
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interventions
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pupil_id UUID REFERENCES pupils(id) ON DELETE CASCADE,
    type VARCHAR(100), -- Material, Social, Psych, Medical, Legal
    description TEXT,
    status intervention_status DEFAULT 'PENDING',
    assigned_to UUID REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    results_observed TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Intervention Logs (History of actions)
CREATE TABLE intervention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action_type VARCHAR(50),
    details TEXT,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

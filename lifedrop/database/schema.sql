-- LifeDrop Blood Donor App - Database Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geolocation queries

-- ─────────────────────────────────────────
-- USERS (Donors & Receivers)
-- ─────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) UNIQUE,
  phone           VARCHAR(20) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('donor','receiver','both')),
  blood_group     VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  avatar_url      TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  fcm_token       TEXT,                     -- Firebase push notification token
  location        GEOGRAPHY(POINT, 4326),   -- PostGIS point (lng, lat)
  address         TEXT,
  city            VARCHAR(80),
  state           VARCHAR(80),
  points          INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_blood_group ON users(blood_group);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_available ON users(is_available);

-- ─────────────────────────────────────────
-- DONATION HISTORY
-- ─────────────────────────────────────────
CREATE TABLE donations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id      UUID,                     -- optional: linked to a blood request
  hospital        VARCHAR(200),
  units           INT DEFAULT 1,
  donated_at      TIMESTAMPTZ NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_date ON donations(donated_at);

-- ─────────────────────────────────────────
-- BLOOD REQUESTS
-- ─────────────────────────────────────────
CREATE TABLE blood_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blood_group     VARCHAR(5) NOT NULL,
  units_needed    INT NOT NULL DEFAULT 1,
  units_fulfilled INT DEFAULT 0,
  hospital        VARCHAR(200) NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  address         TEXT,
  urgency         VARCHAR(10) NOT NULL DEFAULT 'moderate' CHECK (urgency IN ('critical','moderate','planned')),
  status          VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active','fulfilled','expired','cancelled')),
  notes           TEXT,
  patient_name    VARCHAR(100),
  contact_phone   VARCHAR(20),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requests_blood ON blood_requests(blood_group);
CREATE INDEX idx_requests_status ON blood_requests(status);
CREATE INDEX idx_requests_location ON blood_requests USING GIST(location);
CREATE INDEX idx_requests_urgency ON blood_requests(urgency);

-- ─────────────────────────────────────────
-- REQUEST RESPONSES (donor accepts a request)
-- ─────────────────────────────────────────
CREATE TABLE request_responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','donated','declined','no_show')),
  eta_minutes     INT,
  message         TEXT,
  responded_at    TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ,
  UNIQUE(request_id, donor_id)
);

-- ─────────────────────────────────────────
-- EMERGENCY SOS
-- ─────────────────────────────────────────
CREATE TABLE sos_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id    UUID NOT NULL REFERENCES users(id),
  blood_group     VARCHAR(5) NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  hospital        VARCHAR(200),
  message         TEXT,
  radius_km       INT DEFAULT 15,
  donors_alerted  INT DEFAULT 0,
  status          VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','resolved','expired')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL,  -- sos_alert, request_match, donation_confirmed, eligibility_reminder, badge_earned
  title           VARCHAR(150),
  body            TEXT,
  data            JSONB,
  is_read         BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read);

-- ─────────────────────────────────────────
-- ACHIEVEMENTS / BADGES
-- ─────────────────────────────────────────
CREATE TABLE badges (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(10),
  points      INT DEFAULT 0,
  condition   JSONB  -- e.g. {"type":"donation_count","value":1}
);

INSERT INTO badges (key,name,description,icon,points,condition) VALUES
  ('first_drop',   'First Drop',          'Completed your first donation',  '🩸', 50,  '{"type":"donation_count","value":1}'),
  ('life_hero',    'Life Hero',            'Donated blood 5 or more times',  '🦸', 150, '{"type":"donation_count","value":5}'),
  ('champion',     'Champion Donor',       'Donated blood 10 times',         '🏆', 300, '{"type":"donation_count","value":10}'),
  ('sos_responder','Emergency Responder',  'Responded to an SOS alert',      '🚨', 100, '{"type":"sos_response","value":1}'),
  ('rapid',        'Rapid Responder',      'Responded within 10 minutes',    '⚡', 75,  '{"type":"response_speed","value":10}'),
  ('guardian',     'City Guardian',        'Donated in 3 different hospitals','🏥', 120, '{"type":"hospital_count","value":3}');

CREATE TABLE user_badges (
  user_id    UUID REFERENCES users(id),
  badge_id   INT  REFERENCES badges(id),
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- ─────────────────────────────────────────
-- BLOOD BANKS
-- ─────────────────────────────────────────
CREATE TABLE blood_banks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(20),
  address     TEXT,
  location    GEOGRAPHY(POINT, 4326),
  city        VARCHAR(80),
  open_24h    BOOLEAN DEFAULT FALSE,
  inventory   JSONB  -- {"A+":5,"O-":2,...}
);

CREATE INDEX idx_banks_location ON blood_banks USING GIST(location);

-- ─────────────────────────────────────────
-- CHAT MESSAGES (Donor ↔ Receiver)
-- ─────────────────────────────────────────
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  UUID REFERENCES blood_requests(id),
  sender_id   UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_pair ON messages(sender_id, receiver_id);

-- ─────────────────────────────────────────
-- AI MATCH LOG (audit trail)
-- ─────────────────────────────────────────
CREATE TABLE ai_match_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  UUID REFERENCES blood_requests(id),
  matched_donors JSONB,   -- [{donor_id, score, distance, availability}]
  algorithm_version VARCHAR(10) DEFAULT 'v1',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TRIGGER: auto-update updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON blood_requests FOR EACH ROW EXECUTE FUNCTION update_timestamp();

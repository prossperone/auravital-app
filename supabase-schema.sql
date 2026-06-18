-- ============================================================
--  AURA VITAL — SCHEMA COMPLETO SUPABASE
--  Ejecuta esto en: Supabase → SQL Editor → New Query
-- ============================================================

-- ── EXTENSIONES ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  TABLA: centers (Centros de escaneo)
-- ============================================================
CREATE TABLE centers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  province      TEXT NOT NULL,
  address       TEXT,
  operator_name TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,        -- formato: 18095550001
  email         TEXT,
  schedule      TEXT,                 -- ej: "Lun-Vie 9am-5pm"
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','inactive')),
  commission_rate INTEGER NOT NULL DEFAULT 300, -- RD$ por cita
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  TABLA: appointments (Citas agendadas)
-- ============================================================
CREATE TABLE appointments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code TEXT NOT NULL UNIQUE, -- ej: AV-2024-52318
  center_id      UUID NOT NULL REFERENCES centers(id) ON DELETE RESTRICT,

  -- Datos del cliente
  client_name    TEXT NOT NULL,
  client_phone   TEXT NOT NULL,
  client_age     INTEGER,
  client_email   TEXT,

  -- Cita
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,      -- ej: "2:00 PM"
  province         TEXT NOT NULL,

  -- Estado
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','attended','absent','cancelled')),

  -- Control de comisión
  commission_paid  BOOLEAN DEFAULT FALSE,
  commission_amount INTEGER DEFAULT 300,

  -- Seguimiento 30/90 días
  scanned_at       TIMESTAMPTZ,        -- fecha real del escaneo
  next_scan_due    TIMESTAMPTZ,        -- scanned_at + 30 días
  plan_active      BOOLEAN DEFAULT FALSE,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  TABLA: reports (Informes / infografías generadas por IA)
-- ============================================================
CREATE TABLE reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id   UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  center_id        UUID NOT NULL REFERENCES centers(id),

  -- Resultados del escáner
  attention_areas  TEXT[] NOT NULL DEFAULT '{}',  -- array de áreas
  supplements      JSONB  NOT NULL DEFAULT '[]',  -- [{name, dose}]
  operator_notes   TEXT,

  -- Plan generado por IA (Claude API)
  ai_plan          JSONB,   -- {nutrition, exercise, products, summary}
  ai_generated_at  TIMESTAMPTZ,

  -- URL pública de la infografía
  infographic_url  TEXT,
  share_token      TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),

  -- Plan 90 días
  plan_start_date  DATE,
  plan_end_date    DATE,     -- plan_start_date + 90 días

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  TABLA: liquidations (Liquidaciones diarias por centro)
-- ============================================================
CREATE TABLE liquidations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  center_id       UUID NOT NULL REFERENCES centers(id),
  liquidation_date DATE NOT NULL,

  total_attended  INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL DEFAULT 0,   -- RD$

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','disputed')),

  confirmed_at    TIMESTAMPTZ,
  confirmed_by    TEXT,   -- nombre del operador que confirma
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(center_id, liquidation_date)
);

-- ============================================================
--  TABLA: events / jornadas (Jornadas nacionales itinerantes)
-- ============================================================
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  province        TEXT NOT NULL,
  event_date      DATE NOT NULL,
  location        TEXT,               -- dirección exacta (puede llenarse después)
  capacity        INTEGER NOT NULL DEFAULT 60,
  organizer_center_id UUID REFERENCES centers(id),

  status          TEXT NOT NULL DEFAULT 'planned'
                    CHECK (status IN ('planned','active','completed','cancelled')),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  TABLA: event_interests (Lista previa de interesados por jornada)
-- ============================================================
CREATE TABLE event_interests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  attended    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
--  FUNCIÓN: auto-actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER trg_centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  FUNCIÓN: generar código de referencia único
--  Formato: AV-YYYY-NNNNN
-- ============================================================
CREATE OR REPLACE FUNCTION generate_reference_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists   BOOLEAN;
BEGIN
  LOOP
    new_code := 'AV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    SELECT EXISTS (
      SELECT 1 FROM appointments WHERE reference_code = new_code
    ) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
--  FUNCIÓN: crear liquidación automática al registrar escáner
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_liquidation()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo cuando el estado cambia a 'attended'
  IF NEW.status = 'attended' AND OLD.status != 'attended' THEN

    -- Insertar o actualizar liquidación del día
    INSERT INTO liquidations (center_id, liquidation_date, total_attended, total_amount)
    VALUES (NEW.center_id, CURRENT_DATE, 1, NEW.commission_amount)
    ON CONFLICT (center_id, liquidation_date)
    DO UPDATE SET
      total_attended = liquidations.total_attended + 1,
      total_amount   = liquidations.total_amount + NEW.commission_amount;

    -- Activar plan de seguimiento
    NEW.plan_active   := TRUE;
    NEW.scanned_at    := NOW();
    NEW.next_scan_due := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_liquidation
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION auto_create_liquidation();

-- ============================================================
--  FUNCIÓN: clientes que necesitan reescaneo (30 días)
--  Uso: SELECT * FROM get_rescan_alerts();
-- ============================================================
CREATE OR REPLACE FUNCTION get_rescan_alerts()
RETURNS TABLE (
  client_name      TEXT,
  client_phone     TEXT,
  reference_code   TEXT,
  center_name      TEXT,
  days_since_scan  INTEGER,
  next_scan_due    TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.client_name,
    a.client_phone,
    a.reference_code,
    c.name AS center_name,
    EXTRACT(DAY FROM NOW() - a.scanned_at)::INTEGER AS days_since_scan,
    a.next_scan_due
  FROM appointments a
  JOIN centers c ON a.center_id = c.id
  WHERE a.status = 'attended'
    AND a.scanned_at IS NOT NULL
    AND a.next_scan_due <= NOW() + INTERVAL '2 days'  -- alertar 2 días antes
  ORDER BY a.next_scan_due ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
--  ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX idx_appointments_center     ON appointments(center_id);
CREATE INDEX idx_appointments_date       ON appointments(appointment_date);
CREATE INDEX idx_appointments_status     ON appointments(status);
CREATE INDEX idx_appointments_code       ON appointments(reference_code);
CREATE INDEX idx_appointments_next_scan  ON appointments(next_scan_due) WHERE plan_active = TRUE;
CREATE INDEX idx_reports_appointment     ON reports(appointment_id);
CREATE INDEX idx_liquidations_center     ON liquidations(center_id);
CREATE INDEX idx_liquidations_date       ON liquidations(liquidation_date);
CREATE INDEX idx_event_interests_event   ON event_interests(event_id);

-- ============================================================
--  ROW LEVEL SECURITY (RLS) — básico para Beta
-- ============================================================
ALTER TABLE centers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;

-- Política pública: cualquiera puede leer centros activos (para el motor de citas)
CREATE POLICY "Public can view active centers"
  ON centers FOR SELECT
  USING (status = 'active');

-- Política pública: insertar citas (el cliente agenda sin login)
CREATE POLICY "Public can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

-- Política pública: ver reporte por share_token (infografía compartida)
CREATE POLICY "Public can view report by share token"
  ON reports FOR SELECT
  USING (true);  -- filtrado en la API por share_token

-- ============================================================
--  DATOS INICIALES — 10 Centros de ejemplo
-- ============================================================
INSERT INTO centers (name, province, operator_name, whatsapp, schedule) VALUES
  ('Centro Naco',             'Distrito Nacional',       'Roberto Alcántara', '18095550001', 'Lun-Vie 9am-5pm'),
  ('Centro Piantini',         'Distrito Nacional',       'Karla Méndez',      '18095550002', 'Lun-Sáb 9am-4pm'),
  ('Centro Santiago',         'Santiago',                'Hector Núñez',      '18095550003', 'Lun-Vie 9am-5pm'),
  ('Centro Villa Mella Este', 'Santo Domingo Este',      'Ana Pérez',         '18095550004', 'Mar-Sáb 9am-4pm'),
  ('Centro Los Alcarrizos',   'Santo Domingo Oeste',     'Luis Tavarez',      '18095550005', 'Lun-Vie 9am-5pm'),
  ('Centro Villa Mella Norte','Santo Domingo Norte',     'Carmen Vásquez',    '18095550006', 'Lun-Sáb 9am-4pm'),
  ('Centro La Vega',          'La Vega',                 'Pablo Rivas',       '18095550007', 'Lun-Vie 9am-5pm'),
  ('Centro San Pedro',        'San Pedro de Macorís',    'María Santos',      '18095550008', 'Lun-Vie 9am-4pm'),
  ('Centro Puerto Plata',     'Puerto Plata',            'Jorge Pimentel',    '18095550009', 'Mar-Sáb 9am-4pm'),
  ('Centro San Francisco',    'San Francisco de Macorís','Diana Castro',      '18095550010', 'Lun-Vie 9am-5pm');

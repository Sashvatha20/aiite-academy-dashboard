CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_mode VARCHAR(50) DEFAULT 'cash',
  reference_no VARCHAR(100),
  notes TEXT,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id
  ON fee_payments(student_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_date
  ON fee_payments(payment_date);
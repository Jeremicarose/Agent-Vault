ALTER TABLE payment_intents
ADD COLUMN incident_status varchar(32) NOT NULL DEFAULT 'none';

ALTER TABLE payment_intents
ADD COLUMN incident_notes text;

ALTER TABLE payment_intents
ADD COLUMN incident_updated_at timestamptz;

-- Create payment_transactions table for tracking individual payment records
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    paid_date DATE NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX idx_payment_transactions_paid_date ON payment_transactions(paid_date); 
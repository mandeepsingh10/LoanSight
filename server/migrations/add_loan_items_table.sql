-- Create loan_items table for multiple gold/silver items per loan
CREATE TABLE loan_items (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    pm_type TEXT NOT NULL,
    metal_weight REAL NOT NULL,
    purity REAL NOT NULL,
    net_weight REAL NOT NULL,
    gold_silver_notes TEXT
); 
CREATE TABLE IF NOT EXISTS parse_history (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cost INTEGER DEFAULT 15
);

CREATE INDEX idx_parse_history_created_at ON parse_history(created_at DESC);
CREATE INDEX idx_parse_history_status ON parse_history(status);
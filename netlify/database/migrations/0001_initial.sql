-- Visitas agregadas por día (una fila por día, sin datos personales)
CREATE TABLE visits (
  day   DATE    PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Partidas completadas del juego de memoria
CREATE TABLE games (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(16),                       -- NULL hasta que el jugador firma la marca
  moves       SMALLINT     NOT NULL CHECK (moves BETWEEN 8 AND 300),
  seconds     SMALLINT     NOT NULL CHECK (seconds BETWEEN 4 AND 3600),
  claim_token UUID         NOT NULL,             -- solo quien jugó puede poner su nombre
  ip_hash     CHAR(16)     NOT NULL,             -- hash truncado, para limitar abusos
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX games_ranking_idx ON games (moves, seconds, created_at) WHERE name IS NOT NULL;
CREATE INDEX games_ip_recent_idx ON games (ip_hash, created_at);

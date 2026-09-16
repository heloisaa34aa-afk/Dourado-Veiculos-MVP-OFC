BEGIN;

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS fipe_price NUMERIC,
  ADD COLUMN IF NOT EXISTS market_price NUMERIC,
  ADD COLUMN IF NOT EXISTS reference_price_updated_at DATE;

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_fipe_price_nonnegative,
  DROP CONSTRAINT IF EXISTS vehicles_market_price_nonnegative;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_fipe_price_nonnegative CHECK (fipe_price IS NULL OR fipe_price >= 0),
  ADD CONSTRAINT vehicles_market_price_nonnegative CHECK (market_price IS NULL OR market_price >= 0);

COMMENT ON COLUMN public.vehicles.fipe_price IS 'Preço FIPE informado pela concessionária.';
COMMENT ON COLUMN public.vehicles.market_price IS 'Preço médio de mercado informado pela concessionária.';
COMMENT ON COLUMN public.vehicles.reference_price_updated_at IS 'Data da consulta dos preços de referência.';

NOTIFY pgrst, 'reload schema';

COMMIT;

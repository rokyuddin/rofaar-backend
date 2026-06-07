DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'warehouses_code_unique'
			AND conrelid = 'public.warehouses'::regclass
			AND contype = 'u'
	) THEN
		ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_code_unique";
	END IF;
END$$;

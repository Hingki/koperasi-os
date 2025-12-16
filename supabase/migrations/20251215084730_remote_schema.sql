drop extension if exists "pg_net";

create sequence "public"."member_nomor_anggota_seq_20251215";

DROP POLICY IF EXISTS "Enable update for all users on their own profile" ON "public"."member";

alter table "public"."member" alter column "member_type" drop default;

alter table "public"."member" alter column "status" drop default;


alter type "public"."member_status" rename to "member_status__old_version_to_be_dropped";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    create type "public"."member_status" as enum ('pending', 'active', 'suspended', 'resigned');
  END IF;
END$$;



alter type "public"."member_type" rename to "member_type__old_version_to_be_dropped";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    create type "public"."member_type" as enum ('regular', 'premium', 'honorary');
  END IF;
END$$;



alter type "public"."user_role_type" rename to "user_role_type__old_version_to_be_dropped";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    create type "public"."user_role_type" as enum ('admin', 'pengurus', 'bendahara', 'ketua', 'anggota');
  END IF;
END$$;


alter table "public"."member" alter column member_type type "public"."member_type" using member_type::text::"public"."member_type";

alter table "public"."member" alter column status type "public"."member_status" using status::text::"public"."member_status";

alter table "public"."user_role" alter column role type "public"."user_role_type" using role::text::"public"."user_role_type";

alter table "public"."member" alter column "member_type" set default 'regular'::public.member_type;

alter table "public"."member" alter column "status" set default 'pending'::public.member_status;

drop type "public"."member_status__old_version_to_be_dropped";

drop type "public"."member_type__old_version_to_be_dropped";

drop type "public"."user_role_type__old_version_to_be_dropped";

alter table "public"."koperasi" enable row level security;

alter table "public"."user_role" enable row level security;



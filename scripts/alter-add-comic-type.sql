-- 新增 comic（漫画）大类：扩展 type 的 CHECK 约束
-- 在 Supabase SQL Editor 执行（anon key 无法改 schema）
-- 项目：ckynqqqyrjhoxoqttvjo

ALTER TABLE ips DROP CONSTRAINT IF EXISTS ips_type_check;

ALTER TABLE ips ADD CONSTRAINT ips_type_check
  CHECK (type IN ('novel', 'anime', 'comic'));

-- 验证
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'ips_type_check';

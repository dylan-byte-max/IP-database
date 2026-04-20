-- IP Database 数据库表结构
-- 在 Supabase SQL Editor 中执行此文件

-- 1. 创建主表
CREATE TABLE ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 通用字段
  type TEXT NOT NULL CHECK (type IN ('novel', 'anime')),  -- 小说 or 动漫
  name TEXT NOT NULL,                                      -- 作品名称
  raw_md TEXT,                                             -- 完整 MD 报告
  ai_summary TEXT,                                         -- AI 一句话定位
  genre_tags TEXT[] DEFAULT '{}',                          -- 题材标签数组
  douban_score NUMERIC(3,1),                               -- 豆瓣评分
  
  -- 小说特有字段
  author TEXT,                                             -- 作者
  platform TEXT,                                           -- 连载平台（起点/番茄/晋江等）
  word_count TEXT,                                         -- 总字数
  serial_status TEXT,                                      -- 连载状态
  yousuu_score NUMERIC(3,1),                               -- 优书网评分
  qidian_score NUMERIC(3,1),                               -- 起点评分
  adaptation_score NUMERIC(2,1),                           -- 影视化改编潜力综合分（/5）

  -- 动漫特有字段
  studio TEXT,                                             -- 制作公司
  director TEXT,                                           -- 导演/监督
  broadcast_platforms TEXT[] DEFAULT '{}',                  -- 播出平台数组
  source_type TEXT,                                        -- 原著类型（原创/漫画改/小说改等）
  source_name TEXT,                                        -- 原著名称
  production_tier TEXT,                                    -- 制作水准（S/A/B/C）
  total_seasons INTEGER,                                   -- 总季数
  total_episodes INTEGER,                                  -- 总集数
  bangumi_score NUMERIC(3,1),                              -- Bangumi 评分
  bilibili_followers INTEGER,                              -- B站追番人数（万）
  seasons JSONB,                                           -- 各季详情 JSON
  art_style TEXT,                                          -- 画风标签
  audience_target TEXT                                     -- 受众定位
);

-- 2. 创建索引
CREATE INDEX idx_ips_type ON ips(type);
CREATE INDEX idx_ips_name ON ips(name);
CREATE INDEX idx_ips_studio ON ips(studio);
CREATE INDEX idx_ips_douban_score ON ips(douban_score);
CREATE INDEX idx_ips_created_at ON ips(created_at DESC);

-- 3. 启用 RLS（Row Level Security）并设置公开访问策略
-- 对于个人项目，允许所有人读写即可
ALTER TABLE ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read" ON ips FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON ips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON ips FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON ips FOR DELETE USING (true);

-- 4. 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON ips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

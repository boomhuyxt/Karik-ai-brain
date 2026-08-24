-- Script tạo các bảng Database hoàn chỉnh cho JARVIS AI Brain (Supabase PostgreSQL)
-- Bao gồm Bảng Roles riêng biệt, Khóa chính (Primary Key), Khóa ngoại (Foreign Key) và Index

-- 1. Bảng Roles (Danh mục vai trò người dùng)
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(20) PRIMARY KEY,                               -- Khóa chính (PK): '0' (User), '1' (Admin)
  name VARCHAR(50) NOT NULL UNIQUE,                         -- 'User', 'Admin'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm dữ liệu vai trò mặc định ('0': User, '1': Admin)
INSERT INTO public.roles (id, name, description) VALUES
  ('0', 'User', 'Người dùng thông thường'),
  ('1', 'Admin', 'Quản trị viên hệ thống')
ON CONFLICT (id) DO NOTHING;


-- 2. Bảng Users (Quản lý người dùng)
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(100) PRIMARY KEY,                             -- Khóa chính (PK)
  email VARCHAR(255) UNIQUE NOT NULL,                      -- Khóa phụ duy nhất (Unique Index)
  full_name VARCHAR(255),
  password_hash TEXT NOT NULL,
  role_id VARCHAR(20) DEFAULT '0' REFERENCES public.roles(id) ON DELETE SET DEFAULT, -- Khóa ngoại (FK) nối tới roles.id
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')), -- Trạng thái: active / blocked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho email & role_id của người dùng
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);


-- 3. Bảng Token Usage (Theo dõi lượng token AI sử dụng)
CREATE TABLE IF NOT EXISTS public.token_usage (
  id BIGSERIAL PRIMARY KEY,                                 -- Khóa chính (PK)
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL, -- Khóa ngoại (FK) nối tới users.id
  provider VARCHAR(50) NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tìm kiếm nhanh theo provider & user_id
CREATE INDEX IF NOT EXISTS idx_token_usage_user ON public.token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON public.token_usage(provider);


-- 4. Bảng Projects (Quản lý dự án)
CREATE TABLE IF NOT EXISTS public.projects (
  id VARCHAR(100) PRIMARY KEY,                             -- Khóa chính (PK)
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,  -- Khóa ngoại (FK) nối tới users.id
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'In Progress',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tìm kiếm dự án theo người sở hữu (user_id)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);


-- 5. Bảng Memories (Bộ nhớ dài hạn cho người dùng)
CREATE TABLE IF NOT EXISTS public.memories (
  id VARCHAR(100) PRIMARY KEY,                             -- Khóa chính (PK)
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,  -- Khóa ngoại (FK) nối tới users.id
  key VARCHAR(255) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tìm kiếm bộ nhớ nhanh theo người dùng và key
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON public.memories(key);


-- 6. Extension pgvector & Bảng Embeddings (RAG Search System)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.embeddings (
  id BIGSERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_path_chunk UNIQUE (path, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_path ON public.embeddings(path);

-- Hàm RPC match_documents cho Vector Search (Supabase / PGAdmin4)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  path varchar,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    public.embeddings.id,
    public.embeddings.path,
    public.embeddings.chunk_index,
    public.embeddings.content,
    public.embeddings.metadata,
    (1 - (public.embeddings.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings
  WHERE (1 - (public.embeddings.embedding <=> query_embedding)) > match_threshold
  ORDER BY public.embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
-- 7. Bảng Social Accounts (Quản lý tài khoản mạng xã hội liên kết OAuth: Facebook & TikTok)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'tiktok')),
  account_type VARCHAR(20) DEFAULT 'personal' CHECK (account_type IN ('personal', 'admin_system')),
  platform_account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_platform_account UNIQUE (user_id, platform, platform_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_type ON public.social_accounts(account_type);

-- 8. Bảng Social Posts (Quản lý bài đăng, hàng đợi, lịch đăng bài và phê duyệt)
CREATE TABLE IF NOT EXISTS public.social_posts (
  id VARCHAR(100) PRIMARY KEY,
  author_id VARCHAR(100) REFERENCES public.users(id) ON DELETE CASCADE,
  account_id VARCHAR(100) REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'tiktok')),
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'carousel', 'poster')),
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  hashtags JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) DEFAULT 'SCHEDULED' CHECK (status IN (
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PROCESSING', 'PUBLISHED', 'FAILED'
  )),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  post_external_id VARCHAR(255),
  post_external_url TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  reviewed_by VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_author ON public.social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_account ON public.social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts(scheduled_at);




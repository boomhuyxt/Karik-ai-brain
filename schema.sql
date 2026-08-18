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
$$;



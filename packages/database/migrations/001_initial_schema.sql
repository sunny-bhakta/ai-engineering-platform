CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL,
    display_name TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_lower_unique
    ON users (LOWER(email));


CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT organizations_slug_not_empty
        CHECK (length(trim(slug)) > 0)
);

CREATE UNIQUE INDEX organizations_slug_unique
    ON organizations (slug);


CREATE TABLE memberships (
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,

    role TEXT NOT NULL DEFAULT 'member',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, user_id),

    CONSTRAINT memberships_organization_fk
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT memberships_role_check
        CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX memberships_user_id_idx
    ON memberships (user_id);


CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT projects_organization_fk
        FOREIGN KEY (organization_id)
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    CONSTRAINT projects_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT projects_slug_not_empty
        CHECK (length(trim(slug)) > 0),

    CONSTRAINT projects_org_slug_unique
        UNIQUE (organization_id, slug)
);

CREATE INDEX projects_organization_id_idx
    ON projects (organization_id);


CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    user_id UUID,

    title TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT conversations_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX conversations_project_id_idx
    ON conversations (project_id);

CREATE INDEX conversations_user_id_idx
    ON conversations (user_id);


CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL,

    role TEXT NOT NULL,
    content TEXT NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_conversation_fk
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT messages_role_check
        CHECK (
            role IN (
                'system',
                'user',
                'assistant',
                'tool'
            )
        )
);

CREATE INDEX messages_conversation_created_idx
    ON messages (conversation_id, created_at);


CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL,
    uploaded_by UUID,

    name TEXT NOT NULL,
    mime_type TEXT,
    storage_key TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT documents_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT documents_uploaded_by_fk
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT documents_name_not_empty
        CHECK (length(trim(name)) > 0)
);

CREATE INDEX documents_project_id_idx
    ON documents (project_id);


CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL,

    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_chunks_document_fk
        FOREIGN KEY (document_id)
        REFERENCES documents(id)
        ON DELETE CASCADE,

    CONSTRAINT document_chunks_index_positive
        CHECK (chunk_index >= 0),

    CONSTRAINT document_chunks_token_count_positive
        CHECK (
            token_count IS NULL
            OR token_count >= 0
        ),

    CONSTRAINT document_chunks_document_index_unique
        UNIQUE (document_id, chunk_index)
);

CREATE INDEX document_chunks_document_id_idx
    ON document_chunks (document_id);
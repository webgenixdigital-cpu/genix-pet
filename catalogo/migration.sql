-- ============================================================
-- MÓDULO: Catálogo Digital (genixpet.com.br/catalogo/{slug})
-- ============================================================

alter table tenants
  add column if not exists catalogo_slug text unique,
  add column if not exists catalogo_ativo boolean default false;

create table catalogo_config (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  nome text not null,
  slogan text,
  logo_url text,
  whatsapp text not null,
  mensagem_whatsapp text default 'Olá! Gostaria de agendar os seguintes serviços:

{itens}

Total estimado: {total}

Perfil do pet: {origem}',
  modo_selecao text default 'ambos' check (modo_selecao in ('raca','porte','ambos')),
  updated_at timestamptz default now()
);

create table catalogo_racas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  imagem_url text,
  ordem int default 0,
  created_at timestamptz default now()
);

create table catalogo_raca_itens (
  id uuid primary key default gen_random_uuid(),
  raca_id uuid not null references catalogo_racas(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  grupo text not null check (grupo in ('principal','adicional','combo')),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null default 0,
  tosa_tipo text check (tosa_tipo in ('higienica','rotina','estilo','tesoura') or tosa_tipo is null),
  inclui text[],
  destaque boolean default false,
  ordem int default 0
);

create table catalogo_porte_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  grupo text not null check (grupo in ('principal','adicional','combo')),
  nome text not null,
  descricao text,
  tosa_tipo text check (tosa_tipo in ('higienica','rotina','estilo','tesoura') or tosa_tipo is null),
  inclui text[],
  pelagens text[],
  destaque boolean default false,
  ordem int default 0
);

create table catalogo_porte_precos (
  item_id uuid not null references catalogo_porte_itens(id) on delete cascade,
  porte text not null check (porte in ('mini','pequeno','medio','grande','extra_grande','gigante')),
  preco numeric(10,2),
  primary key (item_id, porte)
);

-- ============================================================
-- RLS
-- ============================================================
alter table catalogo_config enable row level security;
alter table catalogo_racas enable row level security;
alter table catalogo_raca_itens enable row level security;
alter table catalogo_porte_itens enable row level security;
alter table catalogo_porte_precos enable row level security;

create policy "leitura publica catalogo_config" on catalogo_config
  for select using (tenant_id in (select id from tenants where catalogo_ativo = true));

create policy "leitura publica catalogo_racas" on catalogo_racas
  for select using (tenant_id in (select id from tenants where catalogo_ativo = true));

create policy "leitura publica catalogo_raca_itens" on catalogo_raca_itens
  for select using (tenant_id in (select id from tenants where catalogo_ativo = true));

create policy "leitura publica catalogo_porte_itens" on catalogo_porte_itens
  for select using (tenant_id in (select id from tenants where catalogo_ativo = true));

create policy "leitura publica catalogo_porte_precos" on catalogo_porte_precos
  for select using (
    item_id in (
      select id from catalogo_porte_itens
      where tenant_id in (select id from tenants where catalogo_ativo = true)
    )
  );

create policy "tenant edita seu catalogo_config" on catalogo_config
  for all using (tenant_id = (select id from tenants where email = auth.email()))
  with check (tenant_id = (select id from tenants where email = auth.email()));

create policy "tenant edita suas catalogo_racas" on catalogo_racas
  for all using (tenant_id = (select id from tenants where email = auth.email()))
  with check (tenant_id = (select id from tenants where email = auth.email()));

create policy "tenant edita seus catalogo_raca_itens" on catalogo_raca_itens
  for all using (tenant_id = (select id from tenants where email = auth.email()))
  with check (tenant_id = (select id from tenants where email = auth.email()));

create policy "tenant edita seus catalogo_porte_itens" on catalogo_porte_itens
  for all using (tenant_id = (select id from tenants where email = auth.email()))
  with check (tenant_id = (select id from tenants where email = auth.email()));

create policy "tenant edita seus catalogo_porte_precos" on catalogo_porte_precos
  for all using (
    item_id in (select id from catalogo_porte_itens where tenant_id = (select id from tenants where email = auth.email()))
  )
  with check (
    item_id in (select id from catalogo_porte_itens where tenant_id = (select id from tenants where email = auth.email()))
  );

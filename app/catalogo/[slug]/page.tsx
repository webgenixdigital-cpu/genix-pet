import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import CatalogoClient from "./catalogo-client";

// ============================================================
// app/catalogo/[slug]/page.tsx
// Página pública do catálogo digital — Server Component.
// Busca os dados no Supabase pelo slug e repassa prontos para o
// componente client (que cuida de toda a interação/seleção).
// ============================================================

export const revalidate = 0; // sempre buscar dados atuais (catálogo muda com frequência)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // client anônimo — RLS cuida da leitura pública
);

export type TosaTipo = "higienica" | "rotina" | "estilo" | "tesoura" | null;
export type Grupo = "principal" | "adicional" | "combo";
export type PorteId = "mini" | "pequeno" | "medio" | "grande" | "extra_grande" | "gigante";

export interface RacaItem {
  id: string;
  grupo: Grupo;
  nome: string;
  descricao: string | null;
  preco: number;
  tosa_tipo: TosaTipo;
  inclui: string[] | null;
  destaque: boolean;
}

export interface Raca {
  id: string;
  nome: string;
  imagem_url: string | null;
  itens: RacaItem[];
}

export interface PorteItem {
  id: string;
  grupo: Grupo;
  nome: string;
  descricao: string | null;
  tosa_tipo: TosaTipo;
  inclui: string[] | null;
  pelagens: string[] | null;
  destaque: boolean;
  precoPorPorte: Partial<Record<PorteId, number>>;
}

export interface CatalogoData {
  tenantId: string;
  empresa: {
    nome: string;
    slogan: string | null;
    logoUrl: string | null;
    whatsapp: string;
  };
  mensagemWhatsapp: string;
  observacoesTosa: { id: string; titulo: string; texto: string }[];
  racas: Raca[];
  porteItens: PorteItem[];
}

const PORTES: { id: PorteId; nome: string; faixa: string }[] = [
  { id: "mini", nome: "Mini", faixa: "1 a 4 kg" },
  { id: "pequeno", nome: "Pequeno", faixa: "4 a 9 kg" },
  { id: "medio", nome: "Médio", faixa: "9 a 15 kg" },
  { id: "grande", nome: "Grande", faixa: "15 a 22 kg" },
  { id: "extra_grande", nome: "Extra Grande", faixa: "22 a 35 kg" },
  { id: "gigante", nome: "Gigante", faixa: "Acima de 35 kg" },
];

const PELAGENS = [
  { id: "longa", nome: "Longa" },
  { id: "curta", nome: "Curta" },
];

// Observações de tosa: texto fixo do produto (não varia por tenant).
// Se no futuro quiser deixar editável por cliente, mover para uma tabela.
const OBSERVACOES_TOSA = [
  { id: "higienica", titulo: "Tosa Higiênica", texto: "Barriga, bumbum e patinhas." },
  { id: "rotina", titulo: "Tosa Rotina", texto: "Tosa completa na máquina, cabeça, corpo e rabo na mesma altura de tosa." },
  { id: "estilo", titulo: "Tosa Estilo", texto: "Tosa completa na lâmina com regulagem de altura e desembolo superficial para um acabamento mais alto. Cabeça e rabo feitos em tesoura, com acabamento mais detalhado." },
  { id: "tesoura", titulo: "Tosa Tesoura (Bebê)", texto: "Tosa completa na tesoura, com acabamento fino e detalhamento técnico de proporção de acordo com o tipo de pelagem da raça." },
];

async function buscarDadosCatalogo(slug: string): Promise<CatalogoData | null> {
  // 1) tenant + config
  const { data: tenant, error: errTenant } = await supabase
    .from("tenants")
    .select("id, catalogo_ativo")
    .eq("catalogo_slug", slug)
    .single();

  if (errTenant || !tenant || !tenant.catalogo_ativo) return null;

  const { data: config, error: errConfig } = await supabase
    .from("catalogo_config")
    .select("nome, slogan, logo_url, whatsapp, mensagem_whatsapp")
    .eq("tenant_id", tenant.id)
    .single();

  if (errConfig || !config) return null;

  // 2) raças + itens
  const { data: racasRaw } = await supabase
    .from("catalogo_racas")
    .select("id, nome, imagem_url, ordem")
    .eq("tenant_id", tenant.id)
    .order("ordem", { ascending: true });

  const racaIds = (racasRaw ?? []).map((r) => r.id);

  const { data: racaItensRaw } = racaIds.length
    ? await supabase
        .from("catalogo_raca_itens")
        .select("id, raca_id, grupo, nome, descricao, preco, tosa_tipo, inclui, destaque, ordem")
        .in("raca_id", racaIds)
        .order("ordem", { ascending: true })
    : { data: [] as any[] };

  const racas: Raca[] = (racasRaw ?? []).map((r) => ({
    id: r.id,
    nome: r.nome,
    imagem_url: r.imagem_url,
    itens: (racaItensRaw ?? [])
      .filter((i) => i.raca_id === r.id)
      .map((i) => ({
        id: i.id,
        grupo: i.grupo,
        nome: i.nome,
        descricao: i.descricao,
        preco: Number(i.preco),
        tosa_tipo: i.tosa_tipo,
        inclui: i.inclui,
        destaque: i.destaque,
      })),
  }));

  // 3) itens do fluxo por porte + preços
  const { data: porteItensRaw } = await supabase
    .from("catalogo_porte_itens")
    .select("id, grupo, nome, descricao, tosa_tipo, inclui, pelagens, destaque, ordem")
    .eq("tenant_id", tenant.id)
    .order("ordem", { ascending: true });

  const porteItemIds = (porteItensRaw ?? []).map((i) => i.id);

  const { data: porteFrecosRaw } = porteItemIds.length
    ? await supabase
        .from("catalogo_porte_precos")
        .select("item_id, porte, preco")
        .in("item_id", porteItemIds)
    : { data: [] as any[] };

  const porteItens: PorteItem[] = (porteItensRaw ?? []).map((i) => {
    const precoPorPorte: Partial<Record<PorteId, number>> = {};
    (porteFrecosRaw ?? [])
      .filter((p) => p.item_id === i.id && p.preco !== null)
      .forEach((p) => {
        precoPorPorte[p.porte as PorteId] = Number(p.preco);
      });
    return {
      id: i.id,
      grupo: i.grupo,
      nome: i.nome,
      descricao: i.descricao,
      tosa_tipo: i.tosa_tipo,
      inclui: i.inclui,
      pelagens: i.pelagens,
      destaque: i.destaque,
      precoPorPorte,
    };
  });

  return {
    tenantId: tenant.id,
    empresa: {
      nome: config.nome,
      slogan: config.slogan,
      logoUrl: config.logo_url,
      whatsapp: config.whatsapp,
    },
    mensagemWhatsapp:
      config.mensagem_whatsapp ||
      "Olá! Gostaria de agendar os seguintes serviços:\n\n{itens}\n\nTotal estimado: {total}\n\nPerfil do pet: {origem}",
    observacoesTosa: OBSERVACOES_TOSA,
    racas,
    porteItens,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const dados = await buscarDadosCatalogo(params.slug);
  if (!dados) return { title: "Catálogo não encontrado" };
  return {
    title: `${dados.empresa.nome} · Catálogo de Serviços`,
    description: dados.empresa.slogan ?? "Monte seu atendimento em poucos cliques",
  };
}

export default async function CatalogoPage({ params }: { params: { slug: string } }) {
  const dados = await buscarDadosCatalogo(params.slug);
  if (!dados) notFound();

  return <CatalogoClient dados={dados} portes={PORTES} pelagens={PELAGENS} />;
}

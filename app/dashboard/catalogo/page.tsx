"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

// ============================================================
// app/dashboard/catalogo/page.tsx
// Tela de edição do catálogo digital, dentro do dashboard já
// autenticado do Genix Pet. Segue o mesmo padrão de auth/RLS
// usado no resto do app: busca o tenant pelo auth.email() e
// todas as escritas passam pelas policies "tenant edita ..."
// já criadas na migration.
// ============================================================

const supabase = createClient();

type PorteId = "mini" | "pequeno" | "medio" | "grande" | "extra_grande" | "gigante";
type Grupo = "principal" | "adicional" | "combo";
type TosaTipo = string; // agora é o id (uuid) de um catalogo_tosa_tipos do tenant, ou "" (nenhum)

const PORTES: { id: PorteId; nome: string }[] = [
  { id: "mini", nome: "Mini" },
  { id: "pequeno", nome: "Pequeno" },
  { id: "medio", nome: "Médio" },
  { id: "grande", nome: "Grande" },
  { id: "extra_grande", nome: "X-Grande" },
  { id: "gigante", nome: "Gigante" },
];

interface TipoTosa {
  id: string;
  nome: string;
  descricao: string;
}

interface CatalogoConfig {
  nome: string;
  slogan: string;
  logo_url: string;
  capa_url: string;
  whatsapp: string;
  mensagem_whatsapp: string;
}

interface Raca {
  id: string;
  nome: string;
  imagem_url: string | null;
}

interface RacaItem {
  id: string;
  raca_id: string;
  grupo: Grupo;
  nome: string;
  descricao: string | null;
  preco: number;
  tosa_tipo: TosaTipo | null;
  inclui: string[] | null;
  destaque: boolean;
  imagem_url: string | null;
  duracao_min: number | null;
  eh_banho_base: boolean;
}

interface PorteItem {
  id: string;
  grupo: Grupo;
  nome: string;
  descricao: string | null;
  tosa_tipo: TosaTipo | null;
  inclui: string[] | null;
  imagem_url: string | null;
  pelagens: string[] | null;
  duracao_min: number | null;
  eh_banho_base: boolean;
  precos: Partial<Record<PorteId, number | null>>;
}

type Aba = "empresa" | "racas" | "tipos-tosa" | "porte-principal" | "porte-adicional" | "porte-combo";

export default function CatalogoAdminPage() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [catalogoAtivo, setCatalogoAtivo] = useState(false);
  const [catalogoSlug, setCatalogoSlug] = useState("");
  const [aba, setAba] = useState<Aba>("empresa");

  const [config, setConfig] = useState<CatalogoConfig>({
    nome: "",
    slogan: "",
    logo_url: "",
    capa_url: "",
    whatsapp: "",
    mensagem_whatsapp: "",
  });

  const [racas, setRacas] = useState<Raca[]>([]);
  const [buscaRaca, setBuscaRaca] = useState("");
  // controla quais cards estão expandidos — por padrão tudo minimizado,
  // só mostrando o nome, até o usuário clicar para editar
  const [racasExpandidas, setRacasExpandidas] = useState<Set<string>>(new Set());
    const [itensExpandidos, setItensExpandidos] = useState<Set<string>>(new Set());
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(new Set());

  function toggleGrupoExpandido(chave: string) {
    setGruposExpandidos((prev) => {
      const novo = new Set(prev);
      novo.has(chave) ? novo.delete(chave) : novo.add(chave);
      return novo;
    });
  }

  function toggleRacaExpandida(id: string) {
    setRacasExpandidas((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }
  function toggleItemExpandido(id: string) {
    setItensExpandidos((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }
  const [racaItens, setRacaItens] = useState<Record<string, RacaItem[]>>({});
  const [porteItens, setPorteItens] = useState<PorteItem[]>([]);
  const [tiposTosa, setTiposTosa] = useState<TipoTosa[]>([]);

  // ---------------- carregar dados ----------------
  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      if (!email) {
        setCarregando(false);
        return;
      }

      const { data: tenant, error: errTenant } = await supabase
        .from("tenants")
        .select("id, catalogo_ativo, catalogo_slug")
        .eq("email", email)
        .single();

      if (errTenant || !tenant) {
        setCarregando(false);
        return;
      }

      setTenantId(tenant.id);
      setCatalogoAtivo(tenant.catalogo_ativo ?? false);
      setCatalogoSlug(tenant.catalogo_slug ?? "");

      const { data: cfg } = await supabase
        .from("catalogo_config")
        .select("nome, slogan, logo_url, capa_url, whatsapp, mensagem_whatsapp")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (cfg) {
        setConfig({
          nome: cfg.nome ?? "",
          slogan: cfg.slogan ?? "",
          logo_url: cfg.logo_url ?? "",
          capa_url: cfg.capa_url ?? "",
          whatsapp: cfg.whatsapp ?? "",
          mensagem_whatsapp: cfg.mensagem_whatsapp ?? "",
        });
      }

      const { data: racasData } = await supabase
        .from("catalogo_racas")
        .select("id, nome, imagem_url")
        .eq("tenant_id", tenant.id)
        .order("ordem", { ascending: true });

      setRacas(racasData ?? []);

      const racaIds = (racasData ?? []).map((r: Raca) => r.id);
      if (racaIds.length) {
        const { data: itensData } = await supabase
          .from("catalogo_raca_itens")
          .select("id, raca_id, grupo, nome, descricao, preco, tosa_tipo, inclui, destaque, imagem_url, duracao_min, eh_banho_base")
          .in("raca_id", racaIds)
          .order("ordem", { ascending: true });

        const agrupado: Record<string, RacaItem[]> = {};
        (itensData ?? []).forEach((item: any) => {
          if (!agrupado[item.raca_id]) agrupado[item.raca_id] = [];
          agrupado[item.raca_id].push({ ...item, preco: Number(item.preco) } as RacaItem);
        });
        setRacaItens(agrupado);
      }

      const { data: porteItensData } = await supabase
        .from("catalogo_porte_itens")
        .select("id, grupo, nome, descricao, tosa_tipo, inclui, imagem_url, pelagens, duracao_min, eh_banho_base")
        .eq("tenant_id", tenant.id)
        .order("ordem", { ascending: true });

      const porteItemIds = (porteItensData ?? []).map((i: any) => i.id);
      let precosData: any[] = [];
      if (porteItemIds.length) {
        const { data } = await supabase
          .from("catalogo_porte_precos")
          .select("item_id, porte, preco")
          .in("item_id", porteItemIds);
        precosData = data ?? [];
      }

      const porteItensMontado: PorteItem[] = (porteItensData ?? []).map((i: any) => {
        const precos: Partial<Record<PorteId, number | null>> = {};
        precosData
          .filter((p) => p.item_id === i.id)
          .forEach((p) => (precos[p.porte as PorteId] = p.preco === null ? null : Number(p.preco)));
        return { ...i, precos };
      });
      setPorteItens(porteItensMontado);

      const { data: tiposTosaData } = await supabase
        .from("catalogo_tosa_tipos")
        .select("id, nome, descricao")
        .eq("tenant_id", tenant.id)
        .order("ordem", { ascending: true });

      setTiposTosa(tiposTosaData ?? []);
    } finally {
      setCarregando(false);
    }
  }

  // ---------------- salvar empresa ----------------
  async function salvarEmpresa() {
    if (!tenantId) return;
    setSalvando(true);
    const { error } = await supabase
      .from("catalogo_config")
      .upsert({ tenant_id: tenantId, ...config, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
    setSalvando(false);
    if (error) alert("Erro ao salvar: " + error.message);
    else alert("Dados da empresa salvos!");
  }

  async function alternarCatalogoAtivo() {
    if (!tenantId) return;
    const novoValor = !catalogoAtivo;
    if (novoValor && !catalogoSlug.trim()) {
      alert("Defina um link (slug) antes de ativar o catálogo.");
      return;
    }
    const { error } = await supabase
      .from("tenants")
      .update({ catalogo_ativo: novoValor, catalogo_slug: catalogoSlug.trim() })
      .eq("id", tenantId);
    if (error) alert("Erro ao atualizar: " + error.message);
    else setCatalogoAtivo(novoValor);
  }

  // ---------------- raças ----------------
  async function adicionarRaca() {
    if (!tenantId) return;
    const nome = prompt("Nome da nova raça:");
    if (!nome) return;
    const { data, error } = await supabase
      .from("catalogo_racas")
      .insert({ tenant_id: tenantId, nome, ordem: racas.length })
      .select("id, nome, imagem_url")
      .single();
    if (error) return alert("Erro: " + error.message);
    setRacas([...racas, data]);
    setRacaItens({ ...racaItens, [data.id]: [] });
  }

  async function removerRaca(racaId: string) {
    if (!confirm("Remover esta raça e todos os serviços dela?")) return;
    const { error } = await supabase.from("catalogo_racas").delete().eq("id", racaId);
    if (error) return alert("Erro: " + error.message);
    setRacas(racas.filter((r) => r.id !== racaId));
    const copia = { ...racaItens };
    delete copia[racaId];
    setRacaItens(copia);
  }

  function atualizarCampoRaca(racaId: string, campo: keyof Raca, valor: string) {
    setRacas(racas.map((r) => (r.id === racaId ? { ...r, [campo]: valor } : r)));
  }

  async function salvarRaca(racaId: string) {
    const raca = racas.find((r) => r.id === racaId);
    if (!raca) return;
    const { error } = await supabase
      .from("catalogo_racas")
      .update({ nome: raca.nome, imagem_url: raca.imagem_url })
      .eq("id", racaId);
    if (error) alert("Erro: " + error.message);
  }

  async function adicionarItemRaca(racaId: string, grupo: Grupo) {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("catalogo_raca_itens")
      .insert({
        raca_id: racaId,
        tenant_id: tenantId,
        grupo,
        nome: "Novo item",
        descricao: "",
        preco: 0,
        eh_banho_base: false,
        ordem: (racaItens[racaId] ?? []).length,
      })
      .select("id, raca_id, grupo, nome, descricao, preco, tosa_tipo, inclui, destaque, imagem_url, duracao_min, eh_banho_base")
      .single();
    if (error) return alert("Erro: " + error.message);
    setRacaItens({
      ...racaItens,
      [racaId]: [...(racaItens[racaId] ?? []), { ...data, preco: Number(data.preco) } as RacaItem],
    });
  }

  function atualizarItemRacaLocal(racaId: string, itemId: string, campo: string, valor: any) {
    setRacaItens({
      ...racaItens,
      [racaId]: (racaItens[racaId] ?? []).map((i) => (i.id === itemId ? { ...i, [campo]: valor } : i)),
    });
  }

  async function salvarItemRaca(racaId: string, itemId: string) {
    const item = (racaItens[racaId] ?? []).find((i) => i.id === itemId);
    if (!item) return;
    const { error } = await supabase
      .from("catalogo_raca_itens")
      .update({
        nome: item.nome,
        descricao: item.descricao,
        preco: item.preco,
        tosa_tipo: item.tosa_tipo || null,
        inclui: item.inclui,
        destaque: item.destaque,
        imagem_url: item.imagem_url,
        duracao_min: item.duracao_min,
        eh_banho_base: item.eh_banho_base,
      })
      .eq("id", itemId);
    if (error) alert("Erro: " + error.message);
    else alert("Item salvo!");
  }

  async function removerItemRaca(racaId: string, itemId: string) {
    const { error } = await supabase.from("catalogo_raca_itens").delete().eq("id", itemId);
    if (error) return alert("Erro: " + error.message);
    setRacaItens({ ...racaItens, [racaId]: (racaItens[racaId] ?? []).filter((i) => i.id !== itemId) });
  }
  function gerarMensagemTabelaRaca(raca: Raca): string {
    const itens = racaItens[raca.id] ?? [];
        const grupos: { chave: Grupo; titulo: string }[] = [
      { chave: "combo", titulo: "📦 Combos" },
      { chave: "adicional", titulo: "➕ Adicionais" },
      { chave: "principal", titulo: "🛁 Banho e Tosa" },
    ];

    let texto = `*Tabela de Serviços — ${raca.nome}*\n`;

    grupos.forEach(({ chave, titulo }) => {
      const itensGrupo = itens.filter((i) => i.grupo === chave);
      if (itensGrupo.length === 0) return;

      texto += `\n${titulo}\n`;
      itensGrupo.forEach((item) => {
        const preco = `R$ ${Number(item.preco).toFixed(2).replace(".", ",")}`;
        texto += `\n*${item.nome}*`;
        if (item.descricao) texto += `\n${item.descricao}`;
        texto += `\n${preco}\n`;
      });
    });

    return texto.trim();
  }

  function enviarTabelaWhatsApp(raca: Raca) {
    const texto = gerarMensagemTabelaRaca(raca);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }
  // ---------------- itens por porte ----------------
  async function adicionarItemPorte(grupo: Grupo) {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("catalogo_porte_itens")
      .insert({ tenant_id: tenantId, grupo, nome: "Novo item", descricao: "", eh_banho_base: false, ordem: porteItens.length })
      .select("id, grupo, nome, descricao, tosa_tipo, inclui, imagem_url, pelagens, duracao_min, eh_banho_base")
      .single();
    if (error) return alert("Erro: " + error.message);

    const precosVazios: Partial<Record<PorteId, number | null>> = {};
    const linhas = PORTES.map((p) => ({ item_id: data.id, porte: p.id, preco: 0 }));
    await supabase.from("catalogo_porte_precos").insert(linhas);
    PORTES.forEach((p) => (precosVazios[p.id] = 0));

    setPorteItens([...porteItens, { ...data, precos: precosVazios }]);
  }

  function atualizarItemPorteLocal(itemId: string, campo: keyof PorteItem, valor: any) {
    setPorteItens(porteItens.map((i) => (i.id === itemId ? { ...i, [campo]: valor } : i)));
  }

  function atualizarPrecoPorteLocal(itemId: string, porte: PorteId, valor: string) {
    const num = valor === "" ? null : parseFloat(valor);
    setPorteItens(
      porteItens.map((i) => (i.id === itemId ? { ...i, precos: { ...i.precos, [porte]: num } } : i))
    );
  }

  async function salvarItemPorte(itemId: string) {
    const item = porteItens.find((i) => i.id === itemId);
    if (!item) return;

    const { error: errItem } = await supabase
      .from("catalogo_porte_itens")
      .update({
        nome: item.nome,
        descricao: item.descricao,
        tosa_tipo: item.tosa_tipo || null,
        inclui: item.inclui,
        imagem_url: item.imagem_url,
        pelagens: item.pelagens,
        duracao_min: item.duracao_min,
        eh_banho_base: item.eh_banho_base,
      })
      .eq("id", itemId);
    if (errItem) return alert("Erro: " + errItem.message);

    const upserts = PORTES.map((p) => ({
      item_id: itemId,
      porte: p.id,
      preco: item.precos[p.id] ?? null,
    }));
    const { error: errPrecos } = await supabase
      .from("catalogo_porte_precos")
      .upsert(upserts, { onConflict: "item_id,porte" });
    if (errPrecos) alert("Erro ao salvar preços: " + errPrecos.message);
    else alert("Item salvo!");
  }

  async function removerItemPorte(itemId: string) {
    const { error } = await supabase.from("catalogo_porte_itens").delete().eq("id", itemId);
    if (error) return alert("Erro: " + error.message);
    setPorteItens(porteItens.filter((i) => i.id !== itemId));
  }

  // ---------------- tipos de tosa ----------------
  async function adicionarTipoTosa() {
    if (!tenantId) return;
    const nome = prompt("Nome do novo tipo de tosa (ex: Tosa Verão, Desembolo Total, etc):");
    if (!nome) return;
    const { data, error } = await supabase
      .from("catalogo_tosa_tipos")
      .insert({ tenant_id: tenantId, nome, descricao: "", ordem: tiposTosa.length })
      .select("id, nome, descricao")
      .single();
    if (error) return alert("Erro: " + error.message);
    setTiposTosa([...tiposTosa, data]);
  }

  function atualizarTipoTosaLocal(id: string, campo: "nome" | "descricao", valor: string) {
    setTiposTosa(tiposTosa.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));
  }

  async function salvarTipoTosa(id: string) {
    const tipo = tiposTosa.find((t) => t.id === id);
    if (!tipo) return;
    const { error } = await supabase
      .from("catalogo_tosa_tipos")
      .update({ nome: tipo.nome, descricao: tipo.descricao })
      .eq("id", id);
    if (error) alert("Erro: " + error.message);
    else alert("Tipo de tosa salvo!");
  }

  async function removerTipoTosa(id: string) {
    if (!confirm("Remover este tipo de tosa? Itens que usam esse tipo deixarão de abrir o modal explicativo.")) return;
    const { error } = await supabase.from("catalogo_tosa_tipos").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    setTiposTosa(tiposTosa.filter((t) => t.id !== id));
  }

  // ---------------- render ----------------
  if (carregando) return <div className="p-8 text-slate-500">Carregando catálogo...</div>;
  if (!tenantId) return <div className="p-8 text-red-600">Não foi possível identificar seu cadastro. Faça login novamente.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Catálogo Digital</h1>
          <p className="text-sm text-slate-500">Edite preços, raças, serviços, adicionais e combos do seu catálogo público.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${catalogoAtivo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {catalogoAtivo ? "Catálogo ativo" : "Catálogo inativo"}
          </span>
          <button
            onClick={alternarCatalogoAtivo}
            className="text-xs font-semibold border border-slate-300 rounded-full px-3 py-1.5 hover:bg-slate-50"
          >
            {catalogoAtivo ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>

      {catalogoAtivo && catalogoSlug && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm">
          Link público: <a className="text-blue-600 font-semibold underline" href={`/catalogo/${catalogoSlug}`} target="_blank">
            genixpet.com.br/catalogo/{catalogoSlug}
          </a>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 mb-6">
        {([
          ["empresa", "Empresa"],
          ["racas", "Raças"],
          ["tipos-tosa", "Tipos de Tosa"],
                    ["porte-combo", "Combos"],
          ["porte-adicional", "Adicionais"],
          ["porte-principal", "Banho e Tosa"],
        ] as [Aba, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${
              aba === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "empresa" && (
        <div className="border border-slate-200 rounded-xl p-5 space-y-5">
          <Campo label="Link do catálogo (slug)" value={catalogoSlug} onChange={setCatalogoSlug} placeholder="ex: pet-shop-maria" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ImageUploader
              tenantId={tenantId}
              caminho="capa"
              urlAtual={config.capa_url}
              formato="capa"
              label="Foto de capa (topo do catálogo)"
              dica="1200x400px"
              onEnviar={(url) => setConfig({ ...config, capa_url: url })}
            />
            <ImageUploader
              tenantId={tenantId}
              caminho="logo"
              urlAtual={config.logo_url}
              formato="circulo"
              label="Logomarca (sobreposta à capa)"
              dica="400x400px, imagem quadrada"
              onEnviar={(url) => setConfig({ ...config, logo_url: url })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo label="Nome do pet shop" value={config.nome} onChange={(v) => setConfig({ ...config, nome: v })} />
            <Campo label="Slogan" value={config.slogan} onChange={(v) => setConfig({ ...config, slogan: v })} />
          </div>
          <Campo label="WhatsApp (DDI+DDD+número)" value={config.whatsapp} onChange={(v) => setConfig({ ...config, whatsapp: v })} />
          <CampoTextarea
            label="Mensagem enviada no WhatsApp (use {itens}, {total}, {origem})"
            value={config.mensagem_whatsapp}
            onChange={(v) => setConfig({ ...config, mensagem_whatsapp: v })}
          />
          <button
            onClick={salvarEmpresa}
            disabled={salvando}
            className="bg-blue-600 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700"
          >
            {salvando ? "Salvando..." : "Salvar dados da empresa"}
          </button>
        </div>
      )}

      {aba === "racas" && (
        <div>
          <div className="mb-5">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Buscar raça</label>
            <input
              type="text"
              list="lista-racas-cadastradas"
              value={buscaRaca}
              onChange={(e) => setBuscaRaca(e.target.value)}
              placeholder="Digite ou selecione uma raça para filtrar..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
            />
            <datalist id="lista-racas-cadastradas">
              {racas.map((r) => (
                <option key={r.id} value={r.nome} />
              ))}
            </datalist>
            {buscaRaca && (
              <button
                onClick={() => setBuscaRaca("")}
                className="text-xs text-blue-600 font-semibold mt-1.5 hover:underline"
              >
                Limpar busca (mostrando {racas.filter((r) => r.nome.toLowerCase().includes(buscaRaca.toLowerCase())).length} de {racas.length} raças)
              </button>
            )}
          </div>

          {racas
            .filter((raca) => raca.nome.toLowerCase().includes(buscaRaca.toLowerCase()))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
            .map((raca) => (
            <div key={raca.id} className="border-2 border-blue-200 rounded-xl p-4 mb-5 shadow-sm bg-white">
              <button
                type="button"
                onClick={() => toggleRacaExpandida(raca.id)}
                className="w-full flex items-center justify-between bg-blue-50 -mx-4 -mt-4 mb-3 px-4 py-2.5 rounded-t-lg border-b-2 border-blue-200 text-left"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Raça</span>
                  <div className="text-base font-bold text-slate-900">{raca.nome || "(sem nome)"}</div>
                </div>
                <span className={`text-blue-500 transition-transform ${racasExpandidas.has(raca.id) ? "rotate-180" : ""}`}>▾</span>
              </button>

              {racasExpandidas.has(raca.id) && (
                <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                <Campo label="Nome da raça" value={raca.nome} onChange={(v) => atualizarCampoRaca(raca.id, "nome", v)} onBlur={() => salvarRaca(raca.id)} />
                <ImageUploader
                  tenantId={tenantId}
                  caminho={`raca-${raca.id}`}
                  urlAtual={raca.imagem_url}
                  formato="circulo"
                  label="Foto da raça (opcional)"
                  dica="300x300px, imagem quadrada"
                  onEnviar={(url) => {
                    atualizarCampoRaca(raca.id, "imagem_url", url);
                    supabase.from("catalogo_racas").update({ imagem_url: url }).eq("id", raca.id).then();
                  }}
                />
              </div>
                            <div className="flex items-center gap-2 mb-3">
                <button onClick={() => removerRaca(raca.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                  Remover raça
                </button>
                <button
                  type="button"
                  onClick={() => enviarTabelaWhatsApp(raca)}
                  className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100"
                >
                  📤 Enviar tabela
                </button>
              </div>

                            {(["combo", "adicional", "principal"] as Grupo[]).map((grupo) => {
                const chaveGrupo = `${raca.id}-${grupo}`;
                const grupoAberto = gruposExpandidos.has(chaveGrupo);
                return (
                                <div key={grupo} className="border border-slate-200 rounded-lg mt-3 mb-3 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGrupoExpandido(chaveGrupo)}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase text-slate-500 tracking-wide px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span>{grupo === "principal" ? "Banho e Tosa" : grupo === "adicional" ? "Adicionais" : "Combos"}</span>
                    <span className={`transition-transform ${grupoAberto ? "rotate-180" : ""}`}>▾</span>
                  </button>
                                    {grupoAberto && (
                    <div className="px-3 pt-3">
                      {(racaItens[raca.id] ?? [])
                        .filter((i) => i.grupo === grupo)
                        .map((item) => (
                          <ItemForm
                            key={item.id}
                            tenantId={tenantId}
                            item={item}
                            expandido={itensExpandidos.has(item.id)}
                            onToggleExpandir={() => toggleItemExpandido(item.id)}
                            mostrarInclui={grupo === "combo"}
                            mostrarBanhoBase={grupo === "principal"}
                            tiposTosa={tiposTosa}
                            onChange={(campo, valor) => atualizarItemRacaLocal(raca.id, item.id, campo, valor)}
                            onSalvar={() => salvarItemRaca(raca.id, item.id)}
                            onRemover={() => removerItemRaca(raca.id, item.id)}
                          />
                        ))}
                                            <button
                        onClick={() => adicionarItemRaca(raca.id, grupo)}
                        className="w-full border-2 border-dashed border-slate-300 text-blue-600 font-semibold text-sm rounded-lg py-2 mb-3 hover:border-blue-600 hover:bg-blue-50"
                      >
                        + Adicionar item
                                            </button>
                    </div>
                  )}
                </div>
                );
              })}
              </>
              )}
            </div>
          ))}
          <button
            onClick={adicionarRaca}
            className="w-full border-2 border-dashed border-slate-300 text-blue-600 font-bold rounded-xl py-3 hover:border-blue-600 hover:bg-blue-50"
          >
            + Adicionar nova raça
          </button>
        </div>
      )}

      {aba === "tipos-tosa" && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex gap-3">
            <span className="text-lg">✂️</span>
            <p className="text-sm text-blue-800">
              Cada tosador trabalha de um jeito — cadastre aqui os tipos de tosa do seu jeito, com os nomes
              que você usa no dia a dia. O texto de descrição é o que aparece no aviso explicativo quando
              o cliente seleciona um serviço desse tipo no catálogo.
            </p>
          </div>

          {tiposTosa.map((tipo) => (
            <div key={tipo.id} className="border-2 border-slate-200 rounded-xl p-4 mb-4 shadow-sm bg-white">
              <div className="grid grid-cols-1 gap-2.5 mb-2.5">
                <Campo label="Nome do tipo de tosa" value={tipo.nome} onChange={(v) => atualizarTipoTosaLocal(tipo.id, "nome", v)} />
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Descrição (texto do aviso explicativo mostrado ao cliente)
                  </label>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    value={tipo.descricao}
                    onChange={(e) => atualizarTipoTosaLocal(tipo.id, "descricao", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => salvarTipoTosa(tipo.id)} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                  Salvar
                </button>
                <button onClick={() => removerTipoTosa(tipo.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {tiposTosa.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">Nenhum tipo de tosa cadastrado ainda.</p>
          )}

          <button
            onClick={adicionarTipoTosa}
            className="w-full border-2 border-dashed border-slate-300 text-blue-600 font-bold rounded-xl py-3 hover:border-blue-600 hover:bg-blue-50"
          >
            + Adicionar tipo de tosa
          </button>
        </div>
      )}

      {(aba === "porte-principal" || aba === "porte-adicional" || aba === "porte-combo") && (
        <div>
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
            <div className="flex gap-3 mb-3">
              <span className="text-lg">📖</span>
              <div>
                <p className="text-sm font-medium text-blue-900">Como funciona seu catalogo</p>
                <p className="text-sm text-blue-800 mt-1">
                  Cadastre seus servicos aqui, e eles aparecerao automaticamente no seu link publico —
                  pronto pra divulgar nas redes sociais, WhatsApp ou onde quiser. Os clientes escolhem
                  o que precisam e o pedido ja chega pronto pra voce.
                </p>
              </div>
            </div>
            <ul className="text-xs text-blue-800 flex flex-col gap-1.5 pl-8">
              <li><b>Banho e Tosa:</b> o servico principal escolhido pelo cliente (ex: so banho, banho + tosa higienica). So e possivel escolher um por vez.</li>
              <li><b>Adicionais:</b> extras que complementam qualquer Banho e Tosa escolhido (ex: hidratacao, corte de unha). Podem ser somados livremente.</li>
              <li><b>Combos:</b> pacotes fechados com desconto especial, que substituem a escolha avulsa de Banho e Tosa (ex: "Banho + Tosa + Hidratacao por R$ 90").</li>
            </ul>
          </div>
          {porteItens
            .filter((i) => i.grupo === (aba === "porte-principal" ? "principal" : aba === "porte-adicional" ? "adicional" : "combo"))
            .map((item) => (
              <div key={item.id} className="border-2 border-slate-200 rounded-xl p-4 mb-4 shadow-sm bg-white">
                <ItemForm
                  tenantId={tenantId}
                  item={item}
                  expandido={itensExpandidos.has(item.id)}
                  onToggleExpandir={() => toggleItemExpandido(item.id)}
                  mostrarInclui={aba === "porte-combo"}
                  mostrarPelagem
                  mostrarBanhoBase={aba === "porte-principal"}
                  tiposTosa={tiposTosa}
                  onChange={(campo, valor) => atualizarItemPorteLocal(item.id, campo as any, valor)}
                  onSalvar={() => salvarItemPorte(item.id)}
                  onRemover={() => removerItemPorte(item.id)}
                  ocultarSalvarIndividual
                />
                {itensExpandidos.has(item.id) && (
                <>
                <label className="text-xs font-bold text-slate-500 block mt-2 mb-1.5">Preço por porte (R$)</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {PORTES.map((p) => (
                    <div key={p.id}>
                      <label className="text-[10px] text-slate-400">{p.nome}</label>
                      <input
                        type="number"
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        value={item.precos[p.id] ?? ""}
                        onChange={(e) => atualizarPrecoPorteLocal(item.id, p.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => salvarItemPorte(item.id)}
                  className="bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Salvar item
                </button>
                </>
                )}
              </div>
            ))}
          <button
            onClick={() => adicionarItemPorte(aba === "porte-principal" ? "principal" : aba === "porte-adicional" ? "adicional" : "combo")}
            className="w-full border-2 border-dashed border-slate-300 text-blue-600 font-bold rounded-xl py-3 hover:border-blue-600 hover:bg-blue-50"
          >
            + Adicionar item
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Componentes auxiliares de formulário
// ============================================================

// ============================================================
// Upload de imagem (Supabase Storage, bucket "catalogo-imagens")
// Aceita PNG/JPEG, envia pra pasta {tenantId}/{caminho}, e
// retorna a URL pública já pronta pra salvar no banco.
// ============================================================

function ImageUploader({
  tenantId,
  caminho,
  urlAtual,
  formato,
  label,
  dica,
  onEnviar,
}: {
  tenantId: string;
  caminho: string; // ex: "capa", "logo", "item-xxxx"
  urlAtual: string | null | undefined;
  formato: "capa" | "circulo";
  label: string;
  dica?: string;
  onEnviar: (url: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const inputId = `upload-${caminho}`;

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!["image/png", "image/jpeg"].includes(arquivo.type)) {
      alert("Envie apenas arquivos PNG ou JPEG.");
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      alert("Imagem muito grande. Envie um arquivo de até 5MB.");
      return;
    }

    setEnviando(true);
    const extensao = arquivo.type === "image/png" ? "png" : "jpg";
    const caminhoCompleto = `${tenantId}/${caminho}.${extensao}`;

    const { error } = await supabase.storage
      .from("catalogo-imagens")
      .upload(caminhoCompleto, arquivo, { upsert: true, cacheControl: "3600" });

    setEnviando(false);
    if (error) {
      alert("Erro ao enviar imagem: " + error.message);
      return;
    }

    const { data } = supabase.storage.from("catalogo-imagens").getPublicUrl(caminhoCompleto);
    // cache-busting: adiciona timestamp pra imagem atualizar na hora, já que o
    // nome do arquivo é sempre o mesmo (upsert)
    onEnviar(`${data.publicUrl}?t=${Date.now()}`);
  }

  const isCirculo = formato === "circulo";

  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center ${
            isCirculo ? "w-16 h-16 rounded-full" : "w-28 h-16 rounded-lg"
          }`}
        >
          {urlAtual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlAtual} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-xs">Sem foto</span>
          )}
        </div>
        <div>
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-100 inline-block"
          >
            {enviando ? "Enviando..." : urlAtual ? "Trocar imagem" : "Enviar imagem"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/png, image/jpeg"
            className="hidden"
            disabled={enviando}
            onChange={handleArquivo}
          />
          <div className="text-[11px] text-slate-400 mt-1">
            PNG ou JPEG, até 5MB{dica ? ` · Recomendado: ${dica}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
      <input
        type="text"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

function CampoTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 block mb-1">{label}</label>
      <textarea
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ItemForm({
  tenantId,
  item,
  mostrarInclui,
  mostrarPelagem,
  mostrarBanhoBase,
  tiposTosa,
  expandido,
  onToggleExpandir,
  onChange,
  onSalvar,
  onRemover,
  ocultarSalvarIndividual,
}: {
  tenantId: string;
  item: { id: string; nome: string; descricao: string | null; preco?: number; tosa_tipo: TosaTipo | null; inclui: string[] | null; destaque?: boolean; imagem_url?: string | null; pelagens?: string[] | null; duracao_min?: number | null; eh_banho_base?: boolean };
  mostrarInclui: boolean;
  mostrarPelagem?: boolean;
  mostrarBanhoBase?: boolean;
  tiposTosa: TipoTosa[];
  expandido: boolean;
  onToggleExpandir: () => void;
  onChange: (campo: string, valor: any) => void;
  onSalvar: () => void;
  onRemover: () => void;
  ocultarSalvarIndividual?: boolean;
}) {
  return (
    <div className="border-2 border-slate-200 rounded-lg p-3 mb-2.5 bg-white">
      <button
        type="button"
        onClick={onToggleExpandir}
        className="w-full flex items-center justify-between bg-slate-50 -mx-3 -mt-3 mb-3 px-3 py-2 rounded-t-md border-b-2 border-slate-200 text-left"
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Serviço</span>
          <div className="text-sm font-bold text-slate-900">
            {item.nome || "(sem nome)"}
            {"preco" in item && item.preco !== undefined && (
              <span className="ml-2 font-normal text-slate-500">· R$ {item.preco.toFixed(2)}</span>
            )}
          </div>
        </div>
        <span className={`text-slate-400 transition-transform ${expandido ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expandido && (
      <>
      <div className="mb-2.5">
        <ImageUploader
          tenantId={tenantId}
          caminho={`item-${item.id}`}
          urlAtual={item.imagem_url}
          formato="circulo"
          label="Foto do serviço (opcional)"
          dica="200x200px, imagem quadrada"
          onEnviar={(url) => onChange("imagem_url", url)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
        <Campo label="Nome" value={item.nome} onChange={(v) => onChange("nome", v)} />
        {"preco" in item && (
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Preço (R$)</label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={item.preco ?? 0}
              onChange={(e) => onChange("preco", parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
        <Campo label="Descrição" value={item.descricao ?? ""} onChange={(v) => onChange("descricao", v)} />
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Tipo de tosa (abre modal explicativo)</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={item.tosa_tipo ?? ""}
            onChange={(e) => onChange("tosa_tipo", e.target.value)}
          >
            <option value="">(nenhum)</option>
            {tiposTosa.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
          {tiposTosa.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              Nenhum tipo de tosa cadastrado ainda — crie na aba "Tipos de Tosa" para poder vincular aqui.
            </p>
          )}
        </div>
      </div>
      <div className="mb-2.5">
        <label className="text-xs font-semibold text-slate-500 block mb-1">Duração (min) — opcional, deixe em branco se não quiser definir</label>
        <input
          type="number"
          min={0}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={item.duracao_min ?? ""}
          placeholder="Ex: 20"
          onChange={(e) => onChange("duracao_min", e.target.value === "" ? null : parseInt(e.target.value, 10) || 0)}
        />
      </div>
      {mostrarBanhoBase && (
        <label className="flex items-center gap-2 mb-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-blue-600"
            checked={!!item.eh_banho_base}
            onChange={(e) => onChange("eh_banho_base", e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-700">⭐ Este é o banho base (usado para gerar pacotes)</span>
        </label>
      )}
      {mostrarPelagem && (
        <div className="mb-2.5">
          <label className="text-xs font-semibold text-slate-500 block mb-1">Pelagem para a qual este item vale</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={!item.pelagens || item.pelagens.length === 0 ? "ambas" : item.pelagens[0]}
            onChange={(e) => onChange("pelagens", e.target.value === "ambas" ? null : [e.target.value])}
          >
            <option value="ambas">Ambas (curta e longa)</option>
            <option value="curta">Só pelagem curta</option>
            <option value="longa">Só pelagem longa</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Use isso para itens que só fazem sentido em um tipo de pelo — ex: Desembolo só aparece para pets de pelagem longa.
          </p>
        </div>
      )}
      {mostrarInclui && (
        <div className="mb-2.5">
          <Campo
            label="Itens inclusos (separados por vírgula)"
            value={(item.inclui ?? []).join(", ")}
            onChange={(v) => onChange("inclui", v.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </div>
      )}
      <div className="flex gap-2">
        {!ocultarSalvarIndividual && (
          <button onClick={onSalvar} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
            Salvar
          </button>
        )}
        <button onClick={onRemover} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
          Remover
        </button>
      </div>
      </>
      )}
    </div>
  );
}
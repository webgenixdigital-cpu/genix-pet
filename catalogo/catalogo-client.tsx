"use client";

import { useMemo, useState } from "react";
import type { CatalogoData, Raca, RacaItem, PorteItem, PorteId, TosaTipo } from "./page";

// ============================================================
// catalogo-client.tsx
// Toda a lógica de interação do catálogo público:
// - escolha inicial (com raça / sem raça)
// - fluxo raça: cards de raça -> serviços daquela raça
// - fluxo porte: porte + pelagem -> catálogo filtrado
// - bloqueio mútuo entre "Banho e Tosa" (principal) e "Combos"
//   (adicionais ficam sempre livres)
// - modal explicativo de tosa ao selecionar item com tosa_tipo
// - resumo + envio para WhatsApp com mensagem personalizada
// ============================================================

type Passo = "inicio" | "racas" | "porte" | "servicosRaca" | "servicosPorte";

interface Props {
  dados: CatalogoData;
  portes: { id: PorteId; nome: string; faixa: string }[];
  pelagens: { id: string; nome: string }[];
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CatalogoClient({ dados, portes, pelagens }: Props) {
  const [passo, setPasso] = useState<Passo>("inicio");
  const [racaSelecionada, setRacaSelecionada] = useState<Raca | null>(null);
  const [porteSelecionado, setPorteSelecionado] = useState<(typeof portes)[number] | null>(null);
  const [pelagemSelecionada, setPelagemSelecionada] = useState<{ id: string; nome: string } | null>(null);

  const [itensRaca, setItensRaca] = useState<Set<string>>(new Set());
  const [itensPorte, setItensPorte] = useState<Set<string>>(new Set());

  const [modalTosa, setModalTosa] = useState<{ titulo: string; texto: string } | null>(null);

  // -------------------- navegação --------------------
  function irPara(p: Passo) {
    setPasso(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selecionarRaca(raca: Raca) {
    setRacaSelecionada(raca);
    setItensRaca(new Set());
    irPara("servicosRaca");
  }

  function confirmarPorte() {
    setItensPorte(new Set());
    irPara("servicosPorte");
  }

  // -------------------- modal de tosa --------------------
  function abrirModalTosa(tosaTipo: TosaTipo) {
    if (!tosaTipo) return;
    const obs = dados.observacoesTosa.find((o) => o.id === tosaTipo);
    if (!obs) return;
    setModalTosa({ titulo: obs.titulo, texto: obs.texto });
  }

  // -------------------- fluxo raça --------------------
  const grupoDoItemRaca = (id: string): RacaItem["grupo"] | undefined =>
    racaSelecionada?.itens.find((i) => i.id === id)?.grupo;

  const temItemDoGrupoRaca = (grupo: "principal" | "combo") =>
    (racaSelecionada?.itens ?? []).some((i) => i.grupo === grupo && itensRaca.has(i.id));

  function toggleItemRaca(item: RacaItem) {
    const jaMarcado = itensRaca.has(item.id);
    const novo = new Set(itensRaca);

    if (jaMarcado) {
      novo.delete(item.id);
    } else {
      if (item.grupo === "principal" && temItemDoGrupoRaca("combo")) {
        alert("Você já selecionou um Combo. Remova o combo para escolher um serviço avulso de Banho e Tosa.");
        return;
      }
      if (item.grupo === "combo" && temItemDoGrupoRaca("principal")) {
        alert("Você já selecionou um serviço de Banho e Tosa. Remova-o para escolher um Combo.");
        return;
      }
      novo.add(item.id);
      abrirModalTosa(item.tosa_tipo);
    }
    setItensRaca(novo);
  }

  const bloqueioRaca = {
    principal: temItemDoGrupoRaca("combo"),
    combo: temItemDoGrupoRaca("principal"),
  };

  const resumoRaca = useMemo(() => {
    const selecionados = (racaSelecionada?.itens ?? []).filter((i) => itensRaca.has(i.id));
    const total = selecionados.reduce((acc, i) => acc + i.preco, 0);
    return { selecionados, total };
  }, [racaSelecionada, itensRaca]);

  // -------------------- fluxo porte --------------------
  const itemValidoParaPelagem = (item: PorteItem) =>
    !item.pelagens || item.pelagens.length === 0 || (pelagemSelecionada && item.pelagens.includes(pelagemSelecionada.id));

  const itensPorteDisponiveis = useMemo(() => {
    if (!porteSelecionado) return [];
    return dados.porteItens.filter(
      (item) => item.precoPorPorte[porteSelecionado.id] !== undefined && itemValidoParaPelagem(item)
    );
  }, [dados.porteItens, porteSelecionado, pelagemSelecionada]);

  const grupoDoItemPorte = (id: string): PorteItem["grupo"] | undefined =>
    dados.porteItens.find((i) => i.id === id)?.grupo;

  const temItemDoGrupoPorte = (grupo: "principal" | "combo") =>
    itensPorteDisponiveis.some((i) => i.grupo === grupo && itensPorte.has(i.id));

  function toggleItemPorte(item: PorteItem) {
    const jaMarcado = itensPorte.has(item.id);
    const novo = new Set(itensPorte);

    if (jaMarcado) {
      novo.delete(item.id);
    } else {
      if (item.grupo === "principal" && temItemDoGrupoPorte("combo")) {
        alert("Você já selecionou um Combo. Remova o combo para escolher um serviço avulso de Banho e Tosa.");
        return;
      }
      if (item.grupo === "combo" && temItemDoGrupoPorte("principal")) {
        alert("Você já selecionou um serviço de Banho e Tosa. Remova-o para escolher um Combo.");
        return;
      }
      novo.add(item.id);
      abrirModalTosa(item.tosa_tipo);
    }
    setItensPorte(novo);
  }

  const bloqueioPorte = {
    principal: temItemDoGrupoPorte("combo"),
    combo: temItemDoGrupoPorte("principal"),
  };

  const resumoPorte = useMemo(() => {
    if (!porteSelecionado) return { selecionados: [] as PorteItem[], total: 0 };
    const selecionados = itensPorteDisponiveis.filter((i) => itensPorte.has(i.id));
    const total = selecionados.reduce((acc, i) => acc + (i.precoPorPorte[porteSelecionado.id] ?? 0), 0);
    return { selecionados, total };
  }, [itensPorteDisponiveis, itensPorte, porteSelecionado]);

  // -------------------- envio WhatsApp --------------------
  function enviarWhatsapp(tipo: "raca" | "porte") {
    let itensTexto = "";
    let total = 0;
    let origem = "";

    if (tipo === "raca" && racaSelecionada) {
      itensTexto = resumoRaca.selecionados.map((s) => `• ${s.nome} — ${fmtMoeda(s.preco)}`).join("\n");
      total = resumoRaca.total;
      origem = `Raça: ${racaSelecionada.nome}`;
    } else if (tipo === "porte" && porteSelecionado && pelagemSelecionada) {
      itensTexto = resumoPorte.selecionados
        .map((i) => `• ${i.nome} — ${fmtMoeda(i.precoPorPorte[porteSelecionado.id] ?? 0)}`)
        .join("\n");
      total = resumoPorte.total;
      origem = `Porte: ${porteSelecionado.nome} · Pelagem: ${pelagemSelecionada.nome}`;
    }

    const mensagem = dados.mensagemWhatsapp
      .replace("{itens}", itensTexto)
      .replace("{total}", fmtMoeda(total))
      .replace("{origem}", origem);

    const url = `https://wa.me/${dados.empresa.whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  // -------------------- breadcrumb --------------------
  const crumbs: { label: string; passo: Passo }[] = [{ label: "Início", passo: "inicio" }];
  if (passo === "racas" || passo === "servicosRaca") {
    crumbs.push({ label: "Raça", passo: "racas" });
    if (racaSelecionada) crumbs.push({ label: racaSelecionada.nome, passo: "servicosRaca" });
  }
  if (passo === "porte" || passo === "servicosPorte") {
    crumbs.push({ label: "Porte e pelagem", passo: "porte" });
    if (passo === "servicosPorte") crumbs.push({ label: "Catálogo", passo: "servicosPorte" });
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-7 pb-16 text-center">
        {dados.empresa.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dados.empresa.logoUrl} alt="Logo" className="max-h-16 mx-auto mb-3" />
        )}
        <h1 className="text-2xl font-bold">{dados.empresa.nome}</h1>
        {dados.empresa.slogan && <p className="opacity-90 mt-1 text-sm">{dados.empresa.slogan}</p>}
      </header>

      <nav className="max-w-3xl mx-auto px-4 mt-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {crumbs.map((c, i) => (
          <span key={c.passo + i}>
            <button className="text-blue-600 font-semibold hover:underline" onClick={() => irPara(c.passo)}>
              {c.label}
            </button>
            {i < crumbs.length - 1 && <span className="mx-1">›</span>}
          </span>
        ))}
      </nav>

      <div className="max-w-3xl mx-auto px-4 -mt-9">
        <div className="bg-white rounded-2xl shadow-md p-6">
          {passo === "inicio" && (
            <StepInicio onEscolher={(op) => irPara(op === "raca" ? "racas" : "porte")} />
          )}

          {passo === "racas" && (
            <StepRacas racas={dados.racas} onVoltar={() => irPara("inicio")} onSelecionar={selecionarRaca} />
          )}

          {passo === "porte" && (
            <StepPorte
              portes={portes}
              pelagens={pelagens}
              porteSelecionado={porteSelecionado}
              pelagemSelecionada={pelagemSelecionada}
              onSelecionarPorte={setPorteSelecionado}
              onSelecionarPelagem={setPelagemSelecionada}
              onVoltar={() => irPara("inicio")}
              onConfirmar={confirmarPorte}
            />
          )}

          {passo === "servicosRaca" && racaSelecionada && (
            <StepServicosRaca
              raca={racaSelecionada}
              itensSelecionados={itensRaca}
              bloqueio={bloqueioRaca}
              resumo={resumoRaca}
              onVoltar={() => irPara("racas")}
              onToggle={toggleItemRaca}
              onEnviar={() => enviarWhatsapp("raca")}
            />
          )}

          {passo === "servicosPorte" && porteSelecionado && pelagemSelecionada && (
            <StepServicosPorte
              porte={porteSelecionado}
              pelagem={pelagemSelecionada}
              itens={itensPorteDisponiveis}
              itensSelecionados={itensPorte}
              bloqueio={bloqueioPorte}
              resumo={resumoPorte}
              onVoltar={() => irPara("porte")}
              onToggle={toggleItemPorte}
              onEnviar={() => enviarWhatsapp("porte")}
            />
          )}
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 mt-8">Catálogo digital · Genix Pet</footer>

      {modalTosa && (
        <div
          className="fixed inset-0 bg-slate-900/55 flex items-center justify-center p-5 z-50"
          onClick={(e) => e.target === e.currentTarget && setModalTosa(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">✂️ {modalTosa.titulo}</div>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">{modalTosa.texto}</p>
            <button
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700"
              onClick={() => setModalTosa(null)}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Subcomponentes de cada etapa
// ============================================================

function StepInicio({ onEscolher }: { onEscolher: (op: "raca" | "porte") => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-1">Como você quer montar o atendimento?</h2>
      <p className="text-sm text-slate-500 mb-5">
        Escolha uma das opções abaixo para ver os serviços disponíveis para o seu pet.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          className="border-2 border-slate-200 rounded-2xl p-7 text-center hover:border-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition"
          onClick={() => onEscolher("raca")}
        >
          <div className="text-3xl mb-2">🐾</div>
          <div className="font-bold">Meu pet tem raça definida</div>
          <div className="text-sm text-slate-500 mt-1">Selecione a raça do seu pet</div>
        </button>
        <button
          className="border-2 border-slate-200 rounded-2xl p-7 text-center hover:border-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition"
          onClick={() => onEscolher("porte")}
        >
          <div className="text-3xl mb-2">📏</div>
          <div className="font-bold">Não sei a raça / SRD</div>
          <div className="text-sm text-slate-500 mt-1">Selecione pelo porte e pelagem</div>
        </button>
      </div>
    </div>
  );
}

function StepRacas({
  racas,
  onVoltar,
  onSelecionar,
}: {
  racas: Raca[];
  onVoltar: () => void;
  onSelecionar: (r: Raca) => void;
}) {
  return (
    <div>
      <BackButton onClick={onVoltar} />
      <h2 className="text-lg font-bold mb-1">Qual a raça do seu pet?</h2>
      <p className="text-sm text-slate-500 mb-5">Selecione a raça para ver os serviços recomendados.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {racas.map((r) => (
          <button
            key={r.id}
            className="border-2 border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition"
            onClick={() => onSelecionar(r)}
          >
            {r.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.imagem_url} alt={r.nome} className="w-14 h-14 rounded-full object-cover bg-slate-100" />
            ) : (
              <div className="text-3xl">🐶</div>
            )}
            <div className="font-semibold text-sm">{r.nome}</div>
          </button>
        ))}
        {racas.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-8">Nenhuma raça cadastrada ainda.</p>}
      </div>
    </div>
  );
}

function StepPorte({
  portes,
  pelagens,
  porteSelecionado,
  pelagemSelecionada,
  onSelecionarPorte,
  onSelecionarPelagem,
  onVoltar,
  onConfirmar,
}: {
  portes: { id: PorteId; nome: string; faixa: string }[];
  pelagens: { id: string; nome: string }[];
  porteSelecionado: { id: PorteId; nome: string; faixa: string } | null;
  pelagemSelecionada: { id: string; nome: string } | null;
  onSelecionarPorte: (p: { id: PorteId; nome: string; faixa: string }) => void;
  onSelecionarPelagem: (p: { id: string; nome: string }) => void;
  onVoltar: () => void;
  onConfirmar: () => void;
}) {
  const podeConfirmar = !!porteSelecionado && !!pelagemSelecionada;
  return (
    <div>
      <BackButton onClick={onVoltar} />
      <h2 className="text-lg font-bold mb-1">Qual o porte e a pelagem do seu pet?</h2>
      <p className="text-sm text-slate-500 mb-5">Essas informações definem o valor e a duração dos serviços.</p>

      <fieldset className="mb-6">
        <legend className="font-bold text-sm mb-2.5">Porte do pet</legend>
        <div className="flex flex-col gap-2">
          {portes.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2.5 border-[1.5px] rounded-xl px-3.5 py-3 cursor-pointer transition ${
                porteSelecionado?.id === p.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-600"
              }`}
            >
              <input
                type="radio"
                name="porte"
                className="w-[18px] h-[18px] accent-blue-600"
                checked={porteSelecionado?.id === p.id}
                onChange={() => onSelecionarPorte(p)}
              />
              <div>
                <div className="font-semibold text-sm">{p.nome}</div>
                <div className="text-xs text-slate-500">{p.faixa}</div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-5">
        <legend className="font-bold text-sm mb-2.5">Pelagem</legend>
        <div className="flex flex-col gap-2">
          {pelagens.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-2.5 border-[1.5px] rounded-xl px-3.5 py-3 cursor-pointer transition ${
                pelagemSelecionada?.id === p.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-600"
              }`}
            >
              <input
                type="radio"
                name="pelagem"
                className="w-[18px] h-[18px] accent-blue-600"
                checked={pelagemSelecionada?.id === p.id}
                onChange={() => onSelecionarPelagem(p)}
              />
              <div className="font-semibold text-sm">{p.nome}</div>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        disabled={!podeConfirmar}
        onClick={onConfirmar}
        className="w-full bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 disabled:cursor-not-allowed"
      >
        Ver serviços disponíveis
      </button>
    </div>
  );
}

function ItemLista({
  nome,
  descricao,
  inclui,
  destaque,
  preco,
  checked,
  disabled,
  onToggle,
}: {
  nome: string;
  descricao?: string | null;
  inclui?: string[] | null;
  destaque?: boolean;
  preco: number;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 border-[1.5px] rounded-xl px-4 py-3.5 transition ${
        checked ? "border-blue-600 bg-blue-50" : "border-slate-200"
      } ${disabled ? "opacity-40 pointer-events-none" : "cursor-pointer hover:border-blue-600"}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="w-5 h-5 accent-blue-600 shrink-0"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <div>
          <div className="font-semibold text-sm">
            {nome}{" "}
            {destaque && (
              <span className="inline-block text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full ml-1">
                Popular
              </span>
            )}
          </div>
          {descricao && <div className="text-xs text-slate-500 mt-0.5">{descricao}</div>}
          {inclui && inclui.length > 0 && (
            <div className="text-xs text-slate-500 mt-0.5">
              <b className="text-slate-700">Inclui:</b> {inclui.join(", ")}
            </div>
          )}
        </div>
      </div>
      <div className="font-bold text-blue-600 text-sm whitespace-nowrap">{fmtMoeda(preco)}</div>
    </label>
  );
}

function ResumoBar({
  total,
  count,
  disabled,
  onEnviar,
}: {
  total: number;
  count: number;
  disabled: boolean;
  onEnviar: () => void;
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-3.5 -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl mt-5">
      <div className="text-xs text-slate-500">Itens selecionados</div>
      <div className="font-bold mb-2.5 text-sm">
        {count} selecionado(s) · {fmtMoeda(total)}
      </div>
      <button
        disabled={disabled}
        onClick={onEnviar}
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl hover:bg-[#1da851] disabled:cursor-not-allowed"
      >
        📲 Enviar pedido pelo WhatsApp
      </button>
    </div>
  );
}

function StepServicosRaca({
  raca,
  itensSelecionados,
  bloqueio,
  resumo,
  onVoltar,
  onToggle,
  onEnviar,
}: {
  raca: Raca;
  itensSelecionados: Set<string>;
  bloqueio: { principal: boolean; combo: boolean };
  resumo: { selecionados: RacaItem[]; total: number };
  onVoltar: () => void;
  onToggle: (item: RacaItem) => void;
  onEnviar: () => void;
}) {
  const grupos: { chave: RacaItem["grupo"]; titulo: string }[] = [
    { chave: "principal", titulo: "Banho e Tosa" },
    { chave: "adicional", titulo: "Serviços adicionais" },
    { chave: "combo", titulo: "Combos" },
  ];

  return (
    <div>
      <BackButton onClick={onVoltar} />
      <h2 className="text-lg font-bold mb-1">Serviços para {raca.nome}</h2>
      <p className="text-sm text-slate-500 mb-5">Marque um ou mais serviços e envie o pedido pelo WhatsApp.</p>

      {grupos.map((g) => {
        const itens = raca.itens.filter((i) => i.grupo === g.chave);
        if (itens.length === 0) return null;
        return (
          <div key={g.chave}>
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wide mt-5 mb-2.5">{g.titulo}</div>
            <div className="flex flex-col gap-2.5">
              {itens.map((item) => (
                <ItemLista
                  key={item.id}
                  nome={item.nome}
                  descricao={item.descricao}
                  inclui={item.inclui}
                  destaque={item.destaque}
                  preco={item.preco}
                  checked={itensSelecionados.has(item.id)}
                  disabled={
                    (g.chave === "principal" && bloqueio.principal && !itensSelecionados.has(item.id)) ||
                    (g.chave === "combo" && bloqueio.combo && !itensSelecionados.has(item.id))
                  }
                  onToggle={() => onToggle(item)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <ResumoBar
        total={resumo.total}
        count={resumo.selecionados.length}
        disabled={resumo.selecionados.length === 0}
        onEnviar={onEnviar}
      />
    </div>
  );
}

function StepServicosPorte({
  porte,
  pelagem,
  itens,
  itensSelecionados,
  bloqueio,
  resumo,
  onVoltar,
  onToggle,
  onEnviar,
}: {
  porte: { id: PorteId; nome: string; faixa: string };
  pelagem: { id: string; nome: string };
  itens: PorteItem[];
  itensSelecionados: Set<string>;
  bloqueio: { principal: boolean; combo: boolean };
  resumo: { selecionados: PorteItem[]; total: number };
  onVoltar: () => void;
  onToggle: (item: PorteItem) => void;
  onEnviar: () => void;
}) {
  const grupos: { chave: PorteItem["grupo"]; titulo: string }[] = [
    { chave: "principal", titulo: "Banho e Tosa" },
    { chave: "adicional", titulo: "Serviços adicionais" },
    { chave: "combo", titulo: "Combos" },
  ];

  return (
    <div>
      <BackButton onClick={onVoltar} />
      <h2 className="text-lg font-bold mb-1">Catálogo de serviços, planos e combos</h2>
      <p className="text-sm text-slate-500 mb-5">
        Porte: {porte.nome} ({porte.faixa}) · Pelagem: {pelagem.nome}
      </p>

      {grupos.map((g) => {
        const grupoItens = itens.filter((i) => i.grupo === g.chave);
        if (grupoItens.length === 0) return null;
        return (
          <div key={g.chave}>
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wide mt-5 mb-2.5">{g.titulo}</div>
            <div className="flex flex-col gap-2.5">
              {grupoItens.map((item) => (
                <ItemLista
                  key={item.id}
                  nome={item.nome}
                  descricao={item.descricao}
                  inclui={item.inclui}
                  destaque={item.destaque}
                  preco={item.precoPorPorte[porte.id] ?? 0}
                  checked={itensSelecionados.has(item.id)}
                  disabled={
                    (g.chave === "principal" && bloqueio.principal && !itensSelecionados.has(item.id)) ||
                    (g.chave === "combo" && bloqueio.combo && !itensSelecionados.has(item.id))
                  }
                  onToggle={() => onToggle(item)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <ResumoBar
        total={resumo.total}
        count={resumo.selecionados.length}
        disabled={resumo.selecionados.length === 0}
        onEnviar={onEnviar}
      />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="text-blue-600 font-semibold text-sm mb-4 hover:underline" onClick={onClick}>
      ← Voltar
    </button>
  );
}

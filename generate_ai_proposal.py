from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import Flowable
from datetime import date

OUTPUT = "GDP_AI_Agent_Proposta.pdf"

# ── Palette ──────────────────────────────────────────────────────────────────
BLUE_DARK  = HexColor("#0F172A")
BLUE_MID   = HexColor("#1E3A5F")
BLUE_LIGHT = HexColor("#2563EB")
BLUE_PALE  = HexColor("#EFF6FF")
ACCENT     = HexColor("#3B82F6")
GREEN      = HexColor("#16A34A")
RED        = HexColor("#DC2626")
YELLOW     = HexColor("#D97706")
GRAY_DARK  = HexColor("#374151")
GRAY_MID   = HexColor("#6B7280")
GRAY_LIGHT = HexColor("#F1F5F9")
BORDER     = HexColor("#CBD5E1")

W, H = A4


# ── Custom Flowables ──────────────────────────────────────────────────────────
class ColorRect(Flowable):
    def __init__(self, width, height, color, radius=4):
        super().__init__()
        self.width = width
        self.height = height
        self.color = color
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=0)


class SectionHeader(Flowable):
    def __init__(self, number, title, available_width):
        super().__init__()
        self.number = number
        self.title = title
        self.width = available_width
        self.height = 1.1 * cm

    def draw(self):
        c = self.canv
        # background
        c.setFillColor(BLUE_MID)
        c.roundRect(0, 0, self.width, self.height, 5, fill=1, stroke=0)
        # number badge
        badge_w = 0.75 * cm
        c.setFillColor(ACCENT)
        c.roundRect(0.3 * cm, 0.15 * cm, badge_w, self.height - 0.3 * cm, 4, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(0.3 * cm + badge_w / 2, 0.38 * cm, str(self.number))
        # title
        c.setFont("Helvetica-Bold", 11)
        c.drawString(1.3 * cm, 0.38 * cm, self.title)


# ── Styles ────────────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    def S(name, parent="Normal", **kw):
        s = ParagraphStyle(name, parent=base[parent], **kw)
        return s

    return {
        "cover_title": S("cover_title", fontSize=28, leading=34,
                         textColor=white, fontName="Helvetica-Bold", alignment=TA_CENTER),
        "cover_sub":   S("cover_sub",   fontSize=14, leading=20,
                         textColor=HexColor("#93C5FD"), fontName="Helvetica", alignment=TA_CENTER),
        "cover_date":  S("cover_date",  fontSize=10,
                         textColor=HexColor("#94A3B8"), fontName="Helvetica", alignment=TA_CENTER),
        "section_intro": S("section_intro", fontSize=10, leading=15,
                           textColor=GRAY_DARK, fontName="Helvetica", spaceAfter=6),
        "body":        S("body",        fontSize=10, leading=15,
                         textColor=GRAY_DARK, fontName="Helvetica",
                         alignment=TA_JUSTIFY, spaceAfter=4),
        "body_bold":   S("body_bold",   fontSize=10, leading=15,
                         textColor=BLUE_DARK, fontName="Helvetica-Bold", spaceAfter=2),
        "bullet":      S("bullet",      fontSize=10, leading=15,
                         textColor=GRAY_DARK, fontName="Helvetica",
                         leftIndent=14, spaceAfter=3),
        "label":       S("label",       fontSize=8, leading=11,
                         textColor=GRAY_MID, fontName="Helvetica"),
        "example":     S("example",     fontSize=9, leading=14,
                         textColor=BLUE_MID, fontName="Helvetica-Oblique",
                         leftIndent=10, rightIndent=10),
        "h_toc":       S("h_toc",       fontSize=11, leading=16,
                         textColor=BLUE_DARK, fontName="Helvetica-Bold"),
        "toc_item":    S("toc_item",    fontSize=10, leading=15,
                         textColor=GRAY_DARK, fontName="Helvetica"),
        "principle_title": S("principle_title", fontSize=10, leading=14,
                             textColor=BLUE_MID, fontName="Helvetica-Bold"),
        "small":       S("small",       fontSize=8.5, leading=13,
                         textColor=GRAY_MID, fontName="Helvetica"),
        "footer_txt":  S("footer_txt",  fontSize=8,
                         textColor=HexColor("#94A3B8"), fontName="Helvetica", alignment=TA_CENTER),
    }


# ── Page callbacks ────────────────────────────────────────────────────────────
def cover_page_bg(canvas, doc):
    canvas.saveState()
    # full background
    canvas.setFillColor(BLUE_DARK)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # top accent strip
    canvas.setFillColor(ACCENT)
    canvas.rect(0, H - 0.5 * cm, W, 0.5 * cm, fill=1, stroke=0)
    # decorative circle top-right
    canvas.setFillColor(HexColor("#1E3A5F"))
    canvas.circle(W + 1 * cm, H - 2 * cm, 5 * cm, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#243B55"))
    canvas.circle(W - 1 * cm, H - 4 * cm, 3 * cm, fill=1, stroke=0)
    # bottom accent
    canvas.setFillColor(ACCENT)
    canvas.rect(0, 0, W, 0.4 * cm, fill=1, stroke=0)
    canvas.restoreState()


def content_page(canvas, doc):
    canvas.saveState()
    # top bar
    canvas.setFillColor(BLUE_MID)
    canvas.rect(0, H - 1.1 * cm, W, 1.1 * cm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(2 * cm, H - 0.7 * cm, "GDP — Gestão de Provimento")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(W - 2 * cm, H - 0.7 * cm, "Proposta: Agente de IA")
    # bottom bar
    canvas.setFillColor(GRAY_LIGHT)
    canvas.rect(0, 0, W, 1 * cm, fill=1, stroke=0)
    canvas.setFillColor(GRAY_MID)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W / 2, 0.38 * cm,
                             f"Uso interno — GDP Unit Talent Flow  ·  {date.today().strftime('%d/%m/%Y')}")
    canvas.drawRightString(W - 2 * cm, 0.38 * cm, f"Pág. {doc.page}")
    canvas.restoreState()


# ── Helper builders ───────────────────────────────────────────────────────────
def quote_box(text, styles, avail_w):
    inner = avail_w - 2.6 * cm
    p = Paragraph(f'<i>"{text}"</i>', styles["example"])
    data = [[p]]
    t = Table(data, colWidths=[inner])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), BLUE_PALE),
        ("BOX",          (0, 0), (-1, -1), 0.8, ACCENT),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return t


def tag_pill(label, bg, fg=white):
    p = Paragraph(f'<b>{label}</b>',
                  ParagraphStyle("pill", fontSize=8, textColor=fg,
                                 fontName="Helvetica-Bold"))
    t = Table([[p]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROUNDEDCORNERS", [8]),
    ]))
    return t


def card(elements_inside, avail_w, bg=GRAY_LIGHT, border_color=BORDER, padding=10):
    t = Table([[elements_inside]], colWidths=[avail_w - 0.4 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("BOX",           (0, 0), (-1, -1), 0.6, border_color),
        ("LEFTPADDING",   (0, 0), (-1, -1), padding),
        ("RIGHTPADDING",  (0, 0), (-1, -1), padding),
        ("TOPPADDING",    (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return t


# ── Document build ────────────────────────────────────────────────────────────
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=1.6 * cm, bottomMargin=1.6 * cm,
    )
    avail_w = W - 4 * cm
    S = build_styles()
    story = []

    # ── COVER ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("Proposta de Agente de IA", S["cover_title"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("GDP — Gestão de Provimento", S["cover_sub"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("Unit Talent Flow · Sugestões para Stakeholders", S["cover_sub"]))
    story.append(Spacer(1, 2.5 * cm))

    # divider
    hr_data = [[""]]
    hr_t = Table(hr_data, colWidths=[8 * cm])
    hr_t.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, -1), 1.5, ACCENT),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(hr_t)
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"Documento preparado em {date.today().strftime('%d de %B de %Y').replace('January','janeiro').replace('February','fevereiro').replace('March','março').replace('April','abril').replace('May','maio').replace('June','junho').replace('July','julho').replace('August','agosto').replace('September','setembro').replace('October','outubro').replace('November','novembro').replace('December','dezembro')}", S["cover_date"]))
    story.append(Paragraph("Uso interno — Equipe de RH", S["cover_date"]))
    story.append(PageBreak())

    # ── PRINCIPLES ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Princípios desta Proposta", S["h_toc"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Toda sugestão abaixo foi desenhada sobre três critérios inegociáveis:",
        S["section_intro"]))

    principles = [
        ("Dados reais, sem invenção",
         "O agente trabalha exclusivamente sobre dados já persistidos no sistema — timestamps, "
         "status, histórico de alterações, devolutivas. Nenhum conteúdo é gerado sem base concreta."),
        ("Rastreabilidade total",
         "Cada saída do agente exibe os registros usados no cálculo. O usuário pode verificar "
         "a fonte antes de agir, mantendo confiança no sistema."),
        ("Sugestão, nunca ação automática",
         "O agente nunca altera dados. Ele apresenta insights e recomendações; a decisão e "
         "a execução sempre pertencem ao analista ou gestor."),
    ]
    for title, desc in principles:
        story.append(Spacer(1, 0.2 * cm))
        inner = [
            Paragraph(title, S["principle_title"]),
            Paragraph(desc,  S["body"]),
        ]
        t = Table([[inner]], colWidths=[avail_w - 0.6 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), BLUE_PALE),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, ACCENT),
            ("ROUNDEDCORNERS", [3]),
        ]))
        story.append(t)

    story.append(PageBreak())

    # ── SUGGESTIONS ───────────────────────────────────────────────────────────
    suggestions = [
        {
            "num": 1,
            "title": "Detecção de Gargalos no Fluxo",
            "priority": ("Alta Prioridade", GREEN),
            "effort": "Baixo",
            "problem": (
                "Vagas ficam presas em determinados status sem que ninguém perceba, "
                "gerando atrasos invisíveis no processo de provimento."
            ),
            "how": (
                "O agente analisa os campos <b>created_at</b>, <b>updated_at</b> e o array "
                "<b>historico[]</b> de cada vaga. Calcula a mediana histórica de permanência "
                "por <b>tipo_vaga + tratativa + cargo</b> e gera alertas quando uma vaga excede "
                "1,5× o tempo esperado naquela etapa específica."
            ),
            "example": (
                "Vaga #847 (Técnico de Enfermagem – CRER) está há 34 dias em 'Fila de Editais'. "
                "A mediana histórica para este tipo é de 9 dias. Última atualização foi feita por [usuário]."
            ),
            "why_safe": (
                "Baseado integralmente no historico[] e updated_at. "
                "O agente exibe os números que usou — zero inferência subjetiva."
            ),
        },
        {
            "num": 2,
            "title": "Painel de Risco do Banco de Candidatos",
            "priority": ("Alta Prioridade", GREEN),
            "effort": "Baixo",
            "problem": (
                "Candidatos do banco de talentos vencem silenciosamente. "
                "O problema só é descoberto quando já é tarde para convocar."
            ),
            "how": (
                "Com base nos campos <b>data_validade</b>, <b>prorrogacao</b> e "
                "<b>status_calculado</b> já existentes, o agente gera uma visão priorizada "
                "dos candidatos com risco de vencimento nos próximos 30, 60 e 90 dias — "
                "agrupada por <b>cargo + unidade</b>. Cruza automaticamente com vagas abertas "
                "para o mesmo cargo e unidade."
            ),
            "example": (
                "3 candidatos para Fisioterapeuta – HUGOL vencem nos próximos 15 dias. "
                "Nenhum foi convocado. Há 2 vagas abertas para este cargo na unidade."
            ),
            "why_safe": (
                "Cruzamento determinístico entre banco_candidatos e vagas. "
                "Nenhum dado externo ou inferência — apenas cálculo de datas e contagem."
            ),
        },
        {
            "num": 3,
            "title": "Análise de Padrões de Devolutiva",
            "priority": ("Alta Prioridade", GREEN),
            "effort": "Médio",
            "problem": (
                "Gestores não sabem se a taxa de recusa está alta ou baixa, "
                "nem quais fatores (turno, unidade, cargo) mais influenciam as respostas dos candidatos."
            ),
            "how": (
                "Agrega os campos <b>devolutiva</b>, <b>motivo_recusa</b>, <b>horario</b>, "
                "<b>turno</b>, <b>unidade</b> e <b>cargo</b> das convocações. "
                "Identifica padrões estatísticos reais: recusas por horário concentradas em determinado "
                "turno? Faltas mais comuns em determinada unidade? Taxa de aceite por turno/cargo?"
            ),
            "example": (
                "Para Técnico de Enfermagem – HUGOL, 68% das recusas no último trimestre tiveram motivo "
                "'recusa_horario'. Das 24 convocações, 16 foram para o turno noturno. "
                "Taxa de aceite: 72% (diurno) vs. 31% (noturno)."
            ),
            "why_safe": (
                "Nenhuma inferência — apenas agregação e apresentação do que está nos dados. "
                "O usuário vê os números e faz sua própria interpretação."
            ),
        },
        {
            "num": 4,
            "title": "Alertas de Escalada Automática",
            "priority": ("Média Prioridade", YELLOW),
            "effort": "Baixo",
            "problem": (
                "Gestores de unidade que não aprovam vagas pendentes não recebem lembretes "
                "progressivos, travando o fluxo sem visibilidade para a supervisão."
            ),
            "how": (
                "Monitora <b>status_aprovacao_gestor = 'pendente'</b> + <b>updated_at</b> e "
                "gera alertas escalonados: D+3 → alerta para o analista responsável; "
                "D+7 → alerta para a supervisão; D+14 → flag visual no dashboard com destaque de cor. "
                "Nenhuma ação automática — apenas visibilidade progressiva."
            ),
            "example": (
                "Aprovação pendente há 8 dias: Vaga #912 (Nutricionista – HDS). "
                "Responsável: [Gestor X]. Alertas enviados em: D+3 (lido), D+7 (não lido)."
            ),
            "why_safe": (
                "Baseado exclusivamente em campos de data e status existentes. "
                "Nenhuma ação automática é executada — apenas geração de alertas visíveis."
            ),
        },
        {
            "num": 5,
            "title": "Busca por Linguagem Natural sobre os Dados",
            "priority": ("Média Prioridade", YELLOW),
            "effort": "Alto",
            "problem": (
                "Encontrar vagas com critérios combinados exige múltiplos filtros manuais, "
                "consumindo tempo dos analistas e dificultando consultas ad hoc dos gestores."
            ),
            "how": (
                "Permite consultas em português como: "
                "<i>'Quais vagas de liderança aguardam aprovação do gestor há mais de 7 dias?'</i> "
                "O agente traduz a pergunta para uma consulta sobre os dados estruturados "
                "do sistema e retorna o resultado com a lista de registros que embasam a resposta. "
                "Se os dados não existem, responde que não há informação suficiente — sem inventar."
            ),
            "example": (
                "Consulta: 'Qual foi o tempo médio de edital para Fisioterapeuta no último semestre?' "
                "→ Resposta: '14,3 dias em média, baseado em 7 editais concluídos entre Jun–Nov/2025. "
                "[Ver lista de editais]'"
            ),
            "why_safe": (
                "O agente nunca interpreta subjetivamente — apenas recupera e apresenta dados. "
                "Respostas sem dados suficientes retornam mensagem explícita de ausência."
            ),
        },
        {
            "num": 6,
            "title": "Sugestão de Cronograma para Novo Edital",
            "priority": ("Média Prioridade", YELLOW),
            "effort": "Médio",
            "problem": (
                "Ao criar um edital, o analista preenche ~20 datas manualmente sem referência histórica, "
                "gerando cronogramas impraticáveis ou subótimos."
            ),
            "how": (
                "Com base no histórico de <b>cronograma</b> de editais anteriores para o mesmo "
                "<b>cargo</b> (ou categoria similar), sugere um cronograma com intervalos reais. "
                "O analista vê explicitamente de quantos editais históricos o cálculo foi extraído "
                "e pode ajustar livremente. Se há menos de 3 históricos similares, o agente não sugere."
            ),
            "example": (
                "Para editais anteriores de Enfermeiro Assistencial (N=11): "
                "inscrições duraram em média 12 dias, triagem 7 dias, resultado final 4 dias. "
                "Datas sugeridas calculadas a partir de hoje: [ver cronograma]."
            ),
            "why_safe": (
                "Exige mínimo de 3 históricos para sugerir. Exibe N de registros usados. "
                "O analista mantém controle total — nenhuma data é salva automaticamente."
            ),
        },
        {
            "num": 7,
            "title": "Detecção de Inconsistências na Aprovação",
            "priority": ("Média Prioridade", YELLOW),
            "effort": "Baixo",
            "problem": (
                "Vagas enviadas para o gestor de unidade com campos incompletos geram "
                "devoluções desnecessárias, criando retrabalho para analistas e gestores."
            ),
            "how": (
                "Antes do envio para aprovação, analisa <b>distribuicao_aprovacao</b> e "
                "identifica campos faltantes: faixa salarial não preenchida, turno/carga horária "
                "incompatíveis, número de vagas diferente do número de slots. "
                "Cruza com motivos de devolução históricos da mesma unidade para priorizar avisos."
            ),
            "example": (
                "2 de 5 slots não têm horário de entrada/saída preenchido. "
                "Em 100% das devoluções anteriores desta unidade, este foi o motivo (N=8). "
                "Deseja preencher antes de enviar?"
            ),
            "why_safe": (
                "'100% das devoluções anteriores' é uma contagem real. "
                "O agente exibe quantos registros históricos embasam o aviso."
            ),
        },
        {
            "num": 8,
            "title": "Relatório Executivo Automático para Gestores",
            "priority": ("Média Prioridade", YELLOW),
            "effort": "Médio",
            "problem": (
                "Gestores precisam montar relatórios mensais manualmente, cruzando "
                "múltiplas telas e exportações, consumindo tempo significativo."
            ),
            "how": (
                "Gera automaticamente um resumo periódico (semanal/mensal) com métricas reais: "
                "vagas abertas vs. fechadas no período, tempo médio por etapa, "
                "taxa de sucesso por <b>tratativa</b> (banco vs. edital), "
                "editais publicados/em andamento/com atraso, candidatos banco a vencer. "
                "Exportável em XLSX."
            ),
            "example": (
                "Relatório Outubro/2025 — GO-ES: 47 vagas abertas, 12 concluídas, "
                "tempo médio 28 dias. Taxa banco: 71% sucesso. Taxa edital: 43% sucesso. "
                "3 editais com atraso > 15 dias. 7 candidatos banco a vencer em novembro."
            ),
            "why_safe": (
                "O agente não interpreta os números — apenas apresenta métricas calculadas. "
                "Sem qualificações subjetivas ('bom', 'ruim'). A análise é do gestor."
            ),
        },
    ]

    for sug in suggestions:
        story.append(SectionHeader(sug["num"], sug["title"], avail_w))
        story.append(Spacer(1, 0.3 * cm))

        # priority + effort tags row
        prio_label, prio_color = sug["priority"]
        tags_row = [
            [Paragraph("<b>Prioridade:</b>", S["label"]),
             Paragraph(f'<font color="{prio_color.hexval()}"><b>{prio_label}</b></font>', S["label"]),
             Paragraph("", S["label"]),
             Paragraph("<b>Esforço de Implementação:</b>", S["label"]),
             Paragraph(sug["effort"], S["label"])],
        ]
        t_tags = Table(tags_row, colWidths=[2.2*cm, 3*cm, 0.5*cm, 4*cm, 2*cm])
        t_tags.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        story.append(t_tags)
        story.append(Spacer(1, 0.25 * cm))

        def row(bold_label, text):
            return [
                Paragraph(f"<b>{bold_label}</b>", S["body_bold"]),
                Paragraph(text, S["body"]),
            ]

        content_rows = [
            row("Problema:", sug["problem"]),
            [Spacer(1, 0.1*cm), Spacer(1, 0.1*cm)],
            row("Como funciona:", sug["how"]),
            [Spacer(1, 0.1*cm), Spacer(1, 0.1*cm)],
        ]
        t_content = Table(content_rows, colWidths=[2.5*cm, avail_w - 2.5*cm])
        t_content.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ]))
        story.append(t_content)

        # example box
        story.append(Paragraph("Exemplo de saída:", S["body_bold"]))
        story.append(Spacer(1, 0.15 * cm))
        story.append(quote_box(sug["example"], S, avail_w))
        story.append(Spacer(1, 0.2 * cm))

        # safety note
        safety_row = [[
            Paragraph("Por que não alucina:", S["label"]),
            Paragraph(sug["why_safe"], S["small"]),
        ]]
        t_safe = Table(safety_row, colWidths=[3*cm, avail_w - 3*cm])
        t_safe.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), GRAY_LIGHT),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("LINEBEFORE",    (0, 0), (0, -1),  2.5, GREEN),
        ]))
        story.append(t_safe)
        story.append(Spacer(1, 0.6 * cm))
        story.append(HRFlowable(width=avail_w, color=BORDER, thickness=0.5))
        story.append(Spacer(1, 0.4 * cm))

    story.append(PageBreak())

    # ── WHAT NOT TO DO ────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("O que explicitamente NÃO deve ser implementado", S["h_toc"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "As features abaixo foram consideradas e descartadas. Implementá-las criaria risco "
        "de erros com consequências reais e reduziria a confiança dos usuários no sistema.",
        S["body"]))
    story.append(Spacer(1, 0.3 * cm))

    no_list = [
        ("Geração de texto de editais",
         "Conteúdo jurídico e regulatório — um erro de redação tem consequência real no processo seletivo."),
        ("Score ou ranking de candidatos",
         "Sem dados de performance objetivos; introduce viés implícito e gera responsabilidade legal."),
        ("Previsão de sucesso de contratação",
         "Dados históricos insuficientes; correlações frágeis produziriam falsa sensação de precisão."),
        ("Resumo automático de observações",
         "Texto livre interpretado por LLM pode distorcer intenção original do analista."),
        ("Sugestão de faixa salarial",
         "Sem acesso a dados de mercado externos confiáveis e atualizados."),
        ("Ações automáticas sobre vagas",
         "Qualquer alteração de dados deve ter autorização explícita do usuário responsável."),
    ]

    no_rows = []
    for feat, reason in no_list:
        no_rows.append([
            Paragraph(f"<b>✗  {feat}</b>",
                      ParagraphStyle("no_feat", fontSize=10, textColor=RED,
                                     fontName="Helvetica-Bold", leading=14)),
            Paragraph(reason, S["body"]),
        ])

    t_no = Table(no_rows, colWidths=[5*cm, avail_w - 5*cm])
    t_no.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), HexColor("#FEF2F2")),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [HexColor("#FEF2F2"), white]),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("BOX",           (0, 0), (-1, -1), 0.5, HexColor("#FECACA")),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.3, HexColor("#FCA5A5")),
        ("LINEBEFORE",    (0, 0), (0, -1),  3, RED),
    ]))
    story.append(t_no)

    story.append(PageBreak())

    # ── PRIORITY TABLE ────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("Tabela de Priorização", S["h_toc"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "Recomendação de sequência de implementação baseada no equilíbrio entre "
        "esforço técnico e impacto para os usuários:",
        S["body"]))
    story.append(Spacer(1, 0.4 * cm))

    header = ["#", "Feature", "Prioridade", "Esforço", "Impacto Principal"]
    rows_data = [
        ["1", "Detecção de Gargalos no Fluxo",        "Alta", "Baixo",  "Analistas — reduz vagas paradas invisíveis"],
        ["2", "Painel de Risco do Banco de Candidatos","Alta", "Baixo",  "Analistas — evita perda de candidatos por vencimento"],
        ["3", "Análise de Padrões de Devolutiva",      "Alta", "Médio",  "Gestores — visibilidade estratégica de convocações"],
        ["4", "Alertas de Escalada Automática",        "Média","Baixo",  "Supervisão — desbloqueio de aprovações travadas"],
        ["5", "Detecção de Inconsistências na Aprovação","Média","Baixo","Analistas — reduz retrabalho com gestores"],
        ["6", "Relatório Executivo Automático",        "Média","Médio",  "Gestores — elimina montagem manual de relatórios"],
        ["7", "Sugestão de Cronograma para Edital",    "Média","Médio",  "Analistas — cronogramas mais realistas"],
        ["8", "Busca por Linguagem Natural",           "Média","Alto",   "Todos — consultas ad hoc sem múltiplos filtros"],
    ]

    prio_colors = {
        "Alta":  GREEN,
        "Média": YELLOW,
        "Baixa": GRAY_MID,
    }
    effort_colors = {
        "Baixo": GREEN,
        "Médio": YELLOW,
        "Alto":  RED,
    }

    def colored_cell(text, color_map):
        color = color_map.get(text, GRAY_MID)
        return Paragraph(
            f'<font color="{color.hexval()}"><b>{text}</b></font>',
            ParagraphStyle("cc", fontSize=9, fontName="Helvetica-Bold", leading=12)
        )

    table_rows = [
        [Paragraph(f"<b>{h}</b>",
                   ParagraphStyle("th", fontSize=9, textColor=white,
                                  fontName="Helvetica-Bold", leading=12))
         for h in header]
    ]
    for r in rows_data:
        table_rows.append([
            Paragraph(r[0], ParagraphStyle("td_n", fontSize=9, fontName="Helvetica-Bold",
                                           textColor=ACCENT, leading=12)),
            Paragraph(r[1], ParagraphStyle("td", fontSize=9, fontName="Helvetica",
                                           textColor=GRAY_DARK, leading=12)),
            colored_cell(r[2], prio_colors),
            colored_cell(r[3], effort_colors),
            Paragraph(r[4], ParagraphStyle("td_sm", fontSize=8.5, fontName="Helvetica",
                                           textColor=GRAY_MID, leading=12)),
        ])

    col_w = [0.8*cm, 4.8*cm, 2*cm, 1.8*cm, avail_w - 0.8 - 4.8 - 2 - 1.8]
    t_prio = Table(table_rows, colWidths=col_w, repeatRows=1)

    row_bg = []
    for i in range(1, len(table_rows)):
        bg = GRAY_LIGHT if i % 2 == 0 else white
        row_bg.append(("BACKGROUND", (0, i), (-1, i), bg))

    t_prio.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE_MID),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("BOX",           (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID",     (0, 0), (-1, -1), 0.3, BORDER),
        *row_bg,
    ]))
    story.append(t_prio)

    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(
        "Recomendação de início: itens 1, 2 e 4 — os três têm esforço baixo, "
        "dados disponíveis hoje e impacto imediato na operação diária dos analistas.",
        S["body"]))

    # ── BUILD ─────────────────────────────────────────────────────────────────
    def first_page(canvas, doc):
        cover_page_bg(canvas, doc)

    def later_pages(canvas, doc):
        content_page(canvas, doc)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print(f"PDF gerado: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()

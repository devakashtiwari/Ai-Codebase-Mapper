#!/usr/bin/env python3
"""
Generate a professional User Manual PDF for AI Codebase Mapper.
"""

from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable,
    Preformatted, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUTPUT = Path(__file__).resolve().parent.parent / "docs" / "AI_Codebase_Mapper_User_Manual.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# Brand colors
PRIMARY = HexColor("#0e639c")
PRIMARY_DARK = HexColor("#0a4d78")
ACCENT = HexColor("#1f6feb")
BG_LIGHT = HexColor("#f6f8fa")
BG_CODE = HexColor("#1e1e1e")
TEXT = HexColor("#24292f")
MUTED = HexColor("#57606a")
SUCCESS = HexColor("#1a7f37")
WARNING = HexColor("#9a6700")
DANGER = HexColor("#cf222e")
BORDER = HexColor("#d0d7de")
COVER_BG = HexColor("#0d1117")
COVER_ACCENT = HexColor("#58a6ff")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


class ColoredBox(Flowable):
    """Callout / tip / warning box."""

    def __init__(self, text, kind="tip", width=None):
        Flowable.__init__(self)
        self.text = text
        self.kind = kind
        self.box_width = width or (PAGE_W - 2 * MARGIN)
        colors = {
            "tip": (HexColor("#ddf4ff"), HexColor("#0969da"), "TIP"),
            "note": (HexColor("#fff8c5"), HexColor("#9a6700"), "NOTE"),
            "warning": (HexColor("#ffebe9"), HexColor("#cf222e"), "WARNING"),
            "info": (HexColor("#ddf4ff"), HexColor("#0550ae"), "INFO"),
        }
        self.bg, self.border, self.label = colors.get(kind, colors["tip"])

    def wrap(self, availWidth, availHeight):
        self.box_width = min(self.box_width, availWidth)
        style = ParagraphStyle(
            "boxbody",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=TEXT,
        )
        self.para = Paragraph(
            f"<b>{self.label}:</b> {self.text}",
            style,
        )
        w, h = self.para.wrap(self.box_width - 16, availHeight)
        self.height = h + 14
        return self.box_width, self.height

    def draw(self):
        self.canv.setFillColor(self.bg)
        self.canv.setStrokeColor(self.border)
        self.canv.setLineWidth(1.5)
        self.canv.roundRect(0, 0, self.box_width, self.height, 4, fill=1, stroke=1)
        self.para.drawOn(self.canv, 8, 7)


class PromptBlock(Flowable):
    """Monospace-style prompt example block."""

    def __init__(self, text, width=None):
        Flowable.__init__(self)
        self.text = text
        self.box_width = width or (PAGE_W - 2 * MARGIN)

    def wrap(self, availWidth, availHeight):
        self.box_width = min(self.box_width, availWidth)
        style = ParagraphStyle(
            "prompt",
            fontName="Courier",
            fontSize=8.5,
            leading=11,
            textColor=HexColor("#e6edf3"),
        )
        # Escape XML
        safe = (
            self.text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        self.para = Paragraph(safe.replace("\n", "<br/>"), style)
        w, h = self.para.wrap(self.box_width - 16, availHeight)
        self.height = h + 16
        return self.box_width, self.height

    def draw(self):
        self.canv.setFillColor(BG_CODE)
        self.canv.setStrokeColor(HexColor("#30363d"))
        self.canv.setLineWidth(1)
        self.canv.roundRect(0, 0, self.box_width, self.height, 3, fill=1, stroke=1)
        self.para.drawOn(self.canv, 8, 8)


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=white,
        alignment=TA_CENTER,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle",
        fontName="Helvetica",
        fontSize=14,
        leading=18,
        textColor=COVER_ACCENT,
        alignment=TA_CENTER,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="CoverMeta",
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=HexColor("#8b949e"),
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="Section",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=PRIMARY_DARK,
        spaceBefore=16,
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="Subsection",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="Body",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BodyLeft",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT,
        alignment=TA_LEFT,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="ManualBullet",
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=TEXT,
        leftIndent=12,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="TOCEntry",
        fontName="Helvetica",
        fontSize=10,
        leading=16,
        textColor=TEXT,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="TableCell",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=TEXT,
    ))
    styles.add(ParagraphStyle(
        name="TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=white,
    ))
    styles.add(ParagraphStyle(
        name="Footer",
        fontName="Helvetica",
        fontSize=8,
        textColor=MUTED,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="StepTitle",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=PRIMARY_DARK,
        spaceBefore=8,
        spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="Small",
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="Closing",
        fontName="Helvetica-Oblique",
        fontSize=11,
        leading=16,
        textColor=TEXT,
        alignment=TA_CENTER,
        spaceBefore=20,
        spaceAfter=10,
    ))
    return styles


def header_footer(canvas, doc):
    canvas.saveState()
    page = doc.page
    if page > 1:
        # Header
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, PAGE_H - 12 * mm, PAGE_W - MARGIN, PAGE_H - 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, PAGE_H - 10 * mm, "AI Codebase Mapper — User Manual")
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 10 * mm, "v0.1.0")
        # Footer
        canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
        canvas.drawCentredString(PAGE_W / 2, 8 * mm, f"Page {page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    """Drawn on first page only via onFirstPage."""
    canvas.saveState()
    # Full dark background
    canvas.setFillColor(COVER_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Accent bar at top
    canvas.setFillColor(COVER_ACCENT)
    canvas.rect(0, PAGE_H - 8 * mm, PAGE_W, 8 * mm, fill=1, stroke=0)
    # Accent bar at bottom
    canvas.rect(0, 0, PAGE_W, 8 * mm, fill=1, stroke=0)
    # Decorative circle
    canvas.setFillColor(HexColor("#161b22"))
    canvas.circle(PAGE_W - 30 * mm, PAGE_H - 40 * mm, 50 * mm, fill=1, stroke=0)
    canvas.circle(20 * mm, 50 * mm, 35 * mm, fill=1, stroke=0)
    canvas.restoreState()


def make_table(headers, rows, col_widths):
    header_row = [Paragraph(h, ParagraphStyle(
        "th", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=white
    )) for h in headers]
    data = [header_row]
    cell_style = ParagraphStyle(
        "td", fontName="Helvetica", fontSize=8.5, leading=11, textColor=TEXT
    )
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, -1), BG_LIGHT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, BG_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def build():
    styles = build_styles()
    story = []

    # ========== COVER (content floats on dark bg) ==========
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph("AI Codebase Mapper", styles["CoverTitle"]))
    story.append(Paragraph("AI-Powered VS Code Development Assistant", styles["CoverSubtitle"]))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("User Manual &amp; Guide", styles["CoverSubtitle"]))
    story.append(Spacer(1, 18 * mm))
    story.append(Paragraph("Version 0.1.0", styles["CoverMeta"]))
    story.append(Paragraph("Developer: AI Codebase Mapper Contributors", styles["CoverMeta"]))
    story.append(Paragraph("GitHub: [GITHUB URL]", styles["CoverMeta"]))
    story.append(Spacer(1, 25 * mm))
    story.append(Paragraph(
        "Understand unfamiliar projects faster with AI-generated architecture maps,<br/>dependency graphs, and natural-language codebase Q&amp;A.",
        ParagraphStyle("coverdesc", fontName="Helvetica", fontSize=10, leading=14,
                       textColor=HexColor("#8b949e"), alignment=TA_CENTER)
    ))
    story.append(PageBreak())

    # ========== TOC ==========
    story.append(Paragraph("1. Table of Contents", styles["Section"]))
    toc_items = [
        ("2. Introduction", "3"),
        ("3. Key Features", "4"),
        ("4. System Requirements", "5"),
        ("5. Installation Guide", "6"),
        ("6. First-Time Setup", "7"),
        ("7. How the Extension Works", "8"),
        ("8. How to Use the Extension", "9"),
        ("9. How to Write Prompts", "11"),
        ("10. Prompt Writing Best Practices", "12"),
        ("11. Prompt Templates", "13"),
        ("12. Example Complete Workflow", "14"),
        ("13. Understanding AI Responses", "15"),
        ("14. Privacy &amp; Security", "16"),
        ("15. Common Problems &amp; Solutions", "17"),
        ("16. Best Practices for Large Projects", "18"),
        ("17. Frequently Asked Questions (FAQ)", "19"),
        ("18. Tips for Getting Better Results", "20"),
        ("19. Support &amp; Contact", "21"),
        ("20. Quick Start Cheat Sheet", "22"),
        ("21. Closing", "23"),
    ]
    for title, page in toc_items:
        story.append(Paragraph(f"{title} {'.' * 60} {page}", styles["TOCEntry"]))
    story.append(PageBreak())

    # ========== INTRODUCTION ==========
    story.append(Paragraph("2. Introduction", styles["Section"]))
    story.append(Paragraph(
        "<b>AI Codebase Mapper</b> is a Visual Studio Code extension that helps developers "
        "understand and navigate software projects more easily. It scans the files and folders "
        "in your open workspace, analyzes imports and dependencies, and uses Artificial Intelligence "
        "to produce a clear architecture map of your codebase.",
        styles["Body"]
    ))
    story.append(Paragraph(
        "Large projects can feel overwhelming—especially when you join a new team, inherit legacy "
        "code, or switch between many repositories. This extension was created to solve that problem: "
        "it turns a maze of folders and files into an interactive overview with modules, entry points, "
        "important files, and relationships you can explore and ask questions about.",
        styles["Body"]
    ))
    story.append(Paragraph("<b>Who should use it</b>", styles["Subsection"]))
    for item in [
        "Developers joining an unfamiliar codebase",
        "Engineers reviewing architecture or onboarding teammates",
        "Students and learners exploring real-world project structure",
        "Anyone who wants a quick map before diving into the code",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(Paragraph(
        "AI improves the workflow by summarizing structure, highlighting important files, detecting "
        "likely circular dependencies, and answering natural-language questions about how parts of "
        "the project fit together—without requiring you to open every file first.",
        styles["Body"]
    ))
    story.append(ColoredBox(
        "This manual describes features available in version 0.1.0. Features marked "
        "<b>Coming Soon</b> are planned but not yet fully implemented.",
        "note"
    ))
    story.append(PageBreak())

    # ========== KEY FEATURES ==========
    story.append(Paragraph("3. Key Features", styles["Section"]))
    features = [
        ("AI-powered project analysis",
         "Scans your workspace, extracts imports/exports, and sends structured metadata "
         "(and optional code previews) to an OpenAI-compatible AI model to generate an architecture overview."),
        ("File and folder structure visualization",
         "Shows a browsable project file tree. Click a file to open it in the editor."),
        ("Interactive architecture graph",
         "Renders modules, entry points, and important files as an interactive graph "
         "(zoom, pan, click-to-open). Built with React Flow when the webview UI is available."),
        ("Dependency overview",
         "Lists internal import relationships and external packages detected from source files."),
        ("Project overview / AI summary",
         "Displays project type, technologies, modules, entry points, potential problems, "
         "and suggested improvements returned by the AI."),
        ("Natural-language questions about the codebase",
         "Use <b>Ask AI About Project</b> to ask questions such as where authentication lives "
         "or how a feature is structured. Answers use indexed project context."),
        ("File explanations",
         "Use <b>Explain Current File</b> (Command Palette or context menu) to get a concise AI "
         "explanation of the active file: purpose, symbols, dependencies, and related files."),
        ("Large-project navigation",
         "Ignore rules skip node_modules, build outputs, .env, and other noise. File count sent "
         "to the AI is capped for performance."),
        ("Error handling and guidance",
         "Friendly notifications for missing workspace, invalid API key, network errors, and "
         "malformed AI responses. Local fallback map is shown if AI is unavailable."),
        ("Status bar access",
         "A status bar item (AI Map) shows analysis progress and opens the architecture map."),
    ]
    for title, desc in features:
        story.append(Paragraph(title, styles["Subsection"]))
        story.append(Paragraph(desc, styles["Body"]))

    story.append(Paragraph("Coming Soon", styles["Subsection"]))
    for item in [
        "Full in-webview AI chat panel (chat is currently via Command Palette)",
        "Persistent cache across VS Code sessions and incremental re-index",
        "Mermaid diagram export",
        "Tree-sitter–based deep parsers for more languages",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(PageBreak())

    # ========== SYSTEM REQUIREMENTS ==========
    story.append(Paragraph("4. System Requirements", styles["Section"]))
    story.append(Paragraph(
        "Before installing, confirm that your environment meets these requirements.",
        styles["Body"]
    ))
    story.append(make_table(
        ["Requirement", "Details"],
        [
            ["VS Code version", "1.85.0 or later (see package engines field)"],
            ["Operating systems", "Windows, macOS, and Linux (VS Code supported platforms)"],
            ["Internet", "Required for AI analysis (calls your configured API endpoint)"],
            ["AI / API", "OpenAI API key or OpenAI-compatible provider (e.g. Azure OpenAI, local gateway)"],
            ["API key storage", "Stored in VS Code Secret Storage — not in settings.json"],
            ["Permissions", "Read access to the opened workspace folder"],
            ["Optional tools", "Node.js 18+ only if building/running from source"],
        ],
        [45 * mm, 125 * mm]
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(ColoredBox(
        "Without an API key you can still scan and view a basic structure map. "
        "Full AI architecture analysis, file explain, and Ask AI require a valid key.",
        "info"
    ))
    story.append(PageBreak())

    # ========== INSTALLATION ==========
    story.append(Paragraph("5. Installation Guide", styles["Section"]))

    story.append(Paragraph("5.1 Install from source (development)", styles["Subsection"]))
    story.append(Paragraph(
        "Until the extension is published to the Marketplace, install from the project source:",
        styles["Body"]
    ))
    for i, step in enumerate([
        "Open a terminal and go to the extension folder: <font face='Courier'>cd ai-codebase-mapper</font>",
        "Run the install script: <font face='Courier'>bash install.sh</font> "
        "(or install with <font face='Courier'>npm install</font>, then "
        "<font face='Courier'>cd webview &amp;&amp; npm install &amp;&amp; npm run build</font>, then "
        "<font face='Courier'>npm run compile</font>).",
        "Open the folder in VS Code: <font face='Courier'>code .</font>",
        "Press <b>F5</b> to launch the Extension Development Host.",
        "In the new window, open a project folder and use the Command Palette commands under "
        "<b>AI Codebase Mapper</b>.",
    ], 1):
        story.append(Paragraph(f"<b>Step {i}.</b> {step}", styles["BodyLeft"]))

    story.append(Paragraph("5.2 Install from a .vsix file", styles["Subsection"]))
    story.append(Paragraph(
        "If you have a packaged <font face='Courier'>.vsix</font> file:",
        styles["Body"]
    ))
    for i, step in enumerate([
        "Build the package (from the extension folder): <font face='Courier'>npm run package</font>",
        "In VS Code: Extensions view → <b>…</b> menu → <b>Install from VSIX…</b>",
        "Select the generated <font face='Courier'>ai-codebase-mapper-0.1.0.vsix</font> file.",
        "Or from a terminal: <font face='Courier'>code --install-extension ai-codebase-mapper-0.1.0.vsix</font>",
        "Reload VS Code if prompted. Confirm the extension appears under Installed extensions.",
    ], 1):
        story.append(Paragraph(f"<b>Step {i}.</b> {step}", styles["BodyLeft"]))

    story.append(Paragraph("5.3 Marketplace install (when published)", styles["Subsection"]))
    story.append(Paragraph(
        "1. Open VS Code.<br/>"
        "2. Open Extensions (<b>Ctrl+Shift+X</b> / <b>Cmd+Shift+X</b>).<br/>"
        "3. Search for <b>AI Codebase Mapper</b>.<br/>"
        "4. Click <b>Install</b>.<br/>"
        "5. Verify it appears under Installed. Reload if VS Code asks you to.",
        styles["Body"]
    ))
    story.append(ColoredBox(
        "Marketplace listing may not be available yet. Prefer source or VSIX install for version 0.1.0.",
        "note"
    ))
    story.append(PageBreak())

    # ========== FIRST-TIME SETUP ==========
    story.append(Paragraph("6. First-Time Setup", styles["Section"]))
    story.append(Paragraph(
        "Complete these steps once after installation.",
        styles["Body"]
    ))
    story.append(Paragraph("1. Open a workspace", styles["StepTitle"]))
    story.append(Paragraph(
        "<b>Action:</b> File → Open Folder… and select your project root.<br/>"
        "<b>You should see:</b> The project files in the Explorer sidebar.<br/>"
        "<b>If this fails:</b> The extension cannot analyze anything without an open folder.",
        styles["Body"]
    ))
    story.append(Paragraph("2. Run Analyze Project", styles["StepTitle"]))
    story.append(Paragraph(
        "<b>Action:</b> Command Palette → <b>AI Codebase Mapper: Analyze Project</b>.<br/>"
        "<b>You should see:</b> A progress notification (scanning, dependencies, AI map).<br/>"
        "<b>Expected result:</b> Status bar shows “AI Map Ready” and the webview may open.",
        styles["Body"]
    ))
    story.append(Paragraph("3. Enter your API key", styles["StepTitle"]))
    story.append(Paragraph(
        "<b>Action:</b> When prompted, paste an OpenAI or compatible API key.<br/>"
        "<b>You should see:</b> Confirmation that the key was saved securely.<br/>"
        "<b>Common mistake:</b> Pasting a key with extra spaces or using a revoked key.",
        styles["Body"]
    ))
    story.append(Paragraph("4. Recommended settings", styles["StepTitle"]))
    story.append(Paragraph(
        "Open Settings and search for <b>AI Codebase Mapper</b>:",
        styles["Body"]
    ))
    story.append(make_table(
        ["Setting", "Recommended default"],
        [
            ["aiCodebaseMapper.model", "gpt-4o-mini (or your preferred model)"],
            ["aiCodebaseMapper.apiBaseUrl", "https://api.openai.com/v1"],
            ["aiCodebaseMapper.sendSourceCode", "true (or false for metadata-only)"],
            ["aiCodebaseMapper.maxFileSize", "100000"],
            ["aiCodebaseMapper.maxFilesForAI", "150"],
            ["aiCodebaseMapper.autoAnalyze", "false"],
        ],
        [70 * mm, 100 * mm]
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("5. If configuration fails", styles["StepTitle"]))
    story.append(Paragraph(
        "Check the Output panel channel <b>AI Codebase Mapper</b> for logs. "
        "Use <b>Clear Project Cache</b>, verify the API key, and confirm network access "
        "to your API base URL. You can still use the local structural map without AI.",
        styles["Body"]
    ))
    story.append(PageBreak())

    # ========== HOW IT WORKS ==========
    story.append(Paragraph("7. How the Extension Works", styles["Section"]))
    story.append(Paragraph(
        "The extension follows a simple pipeline from your workspace to an interactive map.",
        styles["Body"]
    ))
    story.append(Paragraph("<b>Workflow</b>", styles["Subsection"]))
    workflow = [
        "You open a project folder in VS Code.",
        "You run <b>Analyze Project</b> (or open the map after a previous analysis).",
        "The extension scans files (skipping node_modules, .git, dist, .env, lockfiles, etc.).",
        "It extracts imports/exports and builds a dependency graph locally.",
        "Structured project metadata (and optional code previews) is sent to your AI provider.",
        "The AI returns a validated JSON architecture analysis.",
        "The webview shows Architecture, Dependencies, Files, and AI Summary tabs.",
        "You click nodes to open files, or use Explain / Ask AI for deeper questions.",
    ]
    for i, w in enumerate(workflow, 1):
        story.append(Paragraph(f"<b>{i}.</b> {w}", styles["BodyLeft"]))

    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "<font face='Courier' color='#0e639c'>"
        "Open project → Scan → Dependencies → AI analysis → Interactive map → Ask questions"
        "</font>",
        styles["Body"]
    ))
    story.append(ColoredBox(
        "Secrets and .env files are never scanned. You can disable sending source code "
        "via the sendSourceCode setting so only paths, imports, and metadata are shared.",
        "tip"
    ))
    story.append(PageBreak())

    # ========== HOW TO USE ==========
    story.append(Paragraph("8. How to Use the Extension", styles["Section"]))

    steps = [
        ("Launch / open the map",
         "Command Palette → <b>AI Codebase Mapper: Open Architecture Map</b>, or click the status bar <b>AI Map</b> item.",
         "The webview panel titled “AI Codebase Mapper”.",
         "If nothing has been analyzed yet, analysis starts automatically.",
         "Forgetting to open a folder first."),
        ("Analyze a project",
         "Command Palette → <b>AI Codebase Mapper: Analyze Project</b>.",
         "Progress notifications: Scanning… Analyzing dependencies… Generating AI map…",
         "Status bar: AI Map Ready; webview updates with graph and summary.",
         "Running analyze with no workspace open."),
        ("View the architecture graph",
         "Open the <b>Architecture</b> tab in the webview.",
         "Nodes for project, modules, entry points, important files; edges for relationships.",
         "Zoom/pan the graph; click a file node to open it in the editor.",
         "Expecting every file as a node—only key architecture nodes are shown for clarity."),
        ("Browse files",
         "Open the <b>Files</b> tab.",
         "A folder tree of scanned source files.",
         "Click a file name to open it in VS Code.",
         "Looking for ignored folders (node_modules, dist)—they are intentionally hidden."),
        ("Review dependencies",
         "Open the <b>Dependencies</b> tab.",
         "Internal edges (source → target) and a list of external packages.",
         "Click an internal edge source path to open that file.",
         "Assuming all dynamic imports are resolved—static analysis has limits."),
        ("Read the AI summary",
         "Open the <b>AI Summary</b> tab.",
         "Project type, technologies, modules, entry points, problems, improvements.",
         "Use this as a starting orientation, not absolute truth.",
         "Treating every suggestion as a required code change without verification."),
        ("Explain the current file",
         "Open a file → Command Palette → <b>Explain Current File</b> (or context menu).",
         "A side panel with markdown-style explanation.",
         "Purpose, symbols, dependencies, risks, related files.",
         "Expecting explanations without an API key configured."),
        ("Show dependencies / dependents",
         "With a file open: <b>Show Dependencies</b> or <b>Show Dependents</b>.",
         "A Quick Pick list of related paths.",
         "Select an item to open that file (if it is internal).",
         "Running this before any project analysis."),
        ("Ask AI about the project",
         "Command Palette → <b>Ask AI About Project</b> → type a question.",
         "Input box, then a progress notification, then a chat-style panel with the answer.",
         "Cited paths and a focused answer based on project context.",
         "Asking questions that need files never included in the scan (e.g. ignored paths)."),
        ("Refresh or clear cache",
         "<b>Refresh Analysis</b> re-scans and re-runs AI. <b>Clear Project Cache</b> drops the in-memory snapshot.",
         "Progress again on refresh; confirmation on clear.",
         "Up-to-date map after major code changes.",
         "Assuming cache persists after restart—v0.1.0 cache is in-memory only."),
    ]
    for title, action, see, result, mistake in steps:
        story.append(Paragraph(title, styles["Subsection"]))
        story.append(Paragraph(f"<b>Action:</b> {action}", styles["BodyLeft"]))
        story.append(Paragraph(f"<b>What you should see:</b> {see}", styles["BodyLeft"]))
        story.append(Paragraph(f"<b>Expected result:</b> {result}", styles["BodyLeft"]))
        story.append(Paragraph(f"<b>Common mistake:</b> {mistake}", styles["BodyLeft"]))

    story.append(PageBreak())

    # ========== PROMPTS ==========
    story.append(Paragraph("9. How to Write Prompts", styles["Section"]))
    story.append(Paragraph(
        "You talk to the AI in normal English. Use <b>Ask AI About Project</b> for project-wide "
        "questions, and <b>Explain Current File</b> when a specific file is already open. "
        "Below are example questions you can type into the Ask AI input box.",
        styles["Body"]
    ))

    prompt_examples = [
        ("Understand the project",
         "Explain the overall structure of this project in simple terms."),
        ("Understand a folder",
         "What is the purpose of the src folder?"),
        ("Understand a file",
         "Explain what src/services/api.ts does and how it is used in the project."),
        ("Find relationships",
         "Which files are responsible for authentication?"),
        ("Understand functionality",
         "Where is the login functionality implemented?"),
        ("Find dependencies",
         "Explain how App.tsx connects to the pages and services folders."),
        ("Debugging",
         "Help me identify the possible cause of a failed login based on the project structure."),
        ("Development guidance",
         "If I want to add a payment feature, which files would likely need to be modified?"),
        ("Beginner explanation",
         "Explain this project as if I am a beginner."),
    ]
    for label, prompt in prompt_examples:
        story.append(Paragraph(label, styles["StepTitle"]))
        story.append(PromptBlock(prompt))
        story.append(Spacer(1, 2 * mm))

    story.append(PageBreak())

    # ========== BEST PRACTICES ==========
    story.append(Paragraph("10. Prompt Writing Best Practices", styles["Section"]))
    for tip in [
        "<b>Be specific.</b> Name folders, files, or features when you can.",
        "<b>Mention paths.</b> Example: “src/hooks/useAuth.ts” is better than “the auth hook”.",
        "<b>Describe the output you want.</b> Overview, step-by-step, list of files, risks, etc.",
        "<b>Ask one main question at a time.</b> Follow up after you get an answer.",
        "<b>Paste error messages</b> when debugging so the AI can relate them to structure.",
        "<b>Request simpler language</b> if the first answer is too dense.",
    ]:
        story.append(Paragraph(f"• {tip}", styles["ManualBullet"]))

    story.append(Paragraph("Examples: bad → better → best", styles["Subsection"]))
    story.append(Paragraph("<b>Bad:</b>", styles["BodyLeft"]))
    story.append(PromptBlock("Explain this."))
    story.append(Paragraph("<b>Better:</b>", styles["BodyLeft"]))
    story.append(PromptBlock(
        "Explain the purpose of the src/components folder and describe how its files are related."
    ))
    story.append(Paragraph("<b>Best:</b>", styles["BodyLeft"]))
    story.append(PromptBlock(
        "Analyze the src/components folder and explain the responsibility of each major component, "
        "how the components interact, and which files I should check if the UI is not rendering correctly."
    ))
    story.append(PageBreak())

    # ========== TEMPLATES ==========
    story.append(Paragraph("11. Prompt Templates", styles["Section"]))
    story.append(Paragraph(
        "Copy these templates and replace the bracketed parts.",
        styles["Body"]
    ))
    templates = [
        'Analyze [FILE/FOLDER] and explain its purpose.',
        'Explain how [FEATURE] works in this project.',
        'Find the files related to [FEATURE].',
        'Explain the relationship between [FILE A] and [FILE B].',
        'I want to add [FEATURE]. Which files should I modify and why?',
        'Help me debug [ERROR]. Identify the likely files involved and explain why.',
        'Give me a beginner-friendly overview of this project.',
        'List the entry points of this project and what each one starts.',
        'Are there circular dependencies I should worry about?',
        'Summarize the technologies used and where each one appears.',
    ]
    for t in templates:
        story.append(PromptBlock(t))
        story.append(Spacer(1, 1.5 * mm))
    story.append(PageBreak())

    # ========== EXAMPLE WORKFLOW ==========
    story.append(Paragraph("12. Example Complete Workflow", styles["Section"]))
    story.append(Paragraph(
        "Imagine you open a React + TypeScript app with folders like <font face='Courier'>src/pages</font>, "
        "<font face='Courier'>src/components</font>, and <font face='Courier'>src/services</font>.",
        styles["Body"]
    ))
    example_steps = [
        "Open the project folder in VS Code.",
        "Run <b>AI Codebase Mapper: Analyze Project</b> and enter your API key if prompted.",
        "Wait until the status bar shows <b>AI Map Ready</b>.",
        "Open the Architecture tab: you see modules such as Frontend, entry points like "
        "<font face='Courier'>src/main.tsx</font>, and important files like <font face='Courier'>App.tsx</font>.",
        "Ask AI: <i>Explain the architecture of this project.</i>",
        "Read the answer: technologies (React, TypeScript), modules, and data flow notes.",
        "Follow up: <i>Where is authentication implemented?</i>",
        "Open the cited files (e.g. <font face='Courier'>useAuth.ts</font>, <font face='Courier'>Login.tsx</font>) "
        "from the Files tab or by clicking graph nodes.",
        "Continue development with a clearer mental model of the codebase.",
    ]
    for i, s in enumerate(example_steps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {s}", styles["BodyLeft"]))
    story.append(PageBreak())

    # ========== AI RESPONSES ==========
    story.append(Paragraph("13. Understanding AI Responses", styles["Section"]))
    story.append(Paragraph(
        "AI output is a helpful orientation layer on top of real scan data. Treat it as a guide, "
        "not as a substitute for reading the code.",
        styles["Body"]
    ))
    for item in [
        "<b>Interpret structure claims</b> by opening the cited paths in the editor.",
        "<b>Verify suggestions</b> before changing production code or architecture.",
        "<b>When the AI says “unknown”</b>, the scan context was insufficient—narrow the question or open the file and use Explain.",
        "<b>Follow-up questions</b> work best when you refer to paths from the previous answer.",
        "<b>Request detail or simplicity</b> explicitly (“in three bullets”, “for a beginner”).",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(Spacer(1, 3 * mm))
    story.append(ColoredBox(
        "AI-generated suggestions may not always be completely accurate. "
        "Always verify important code changes before applying them.",
        "warning"
    ))
    story.append(PageBreak())

    # ========== PRIVACY ==========
    story.append(Paragraph("14. Privacy &amp; Security", styles["Section"]))
    story.append(Paragraph(
        "Understanding what leaves your machine is essential.",
        styles["Body"]
    ))
    story.append(make_table(
        ["Topic", "Behavior in AI Codebase Mapper v0.1.0"],
        [
            ["What is scanned", "Source and config files under the workspace, subject to ignore rules"],
            ["Never scanned", ".env, .env.*, secret-like names, lockfiles, node_modules, build outputs, .git"],
            ["Sent to AI", "When sendSourceCode is true: metadata + truncated previews. When false: metadata and dependencies only"],
            ["API key", "Stored in VS Code Secret Storage; never hard-coded; not written to settings.json"],
            ["Network", "Outbound calls only to your configured apiBaseUrl for AI features"],
            ["Redaction", "Common secret patterns are redacted before Explain/Chat content is sent"],
        ],
        [40 * mm, 130 * mm]
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("<b>Recommended practices</b>", styles["Subsection"]))
    for item in [
        "Use a restricted API key with spending limits.",
        "Disable sendSourceCode for highly sensitive repositories.",
        "Do not put secrets in filenames that look like normal source files.",
        "Review ignore patterns and add company-specific paths via excludePatterns.",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(PageBreak())

    # ========== TROUBLESHOOTING ==========
    story.append(Paragraph("15. Common Problems &amp; Solutions", styles["Section"]))
    story.append(make_table(
        ["Problem", "Possible cause", "Solution"],
        [
            ["Extension commands missing", "Not installed / host not loaded", "Install or press F5 in Extension Development Host; reload window"],
            ["AI does not respond", "Missing or invalid API key", "Re-run Analyze and enter a valid key; check apiBaseUrl"],
            ["Project analysis fails", "No folder open", "File → Open Folder… then Analyze Project"],
            ["Empty or weak map", "Most files ignored or non-source", "Confirm you opened the real project root; check excludePatterns"],
            ["Incorrect AI info", "Limited context / model error", "Refresh analysis; ask a more specific prompt; open files to verify"],
            ["Extension feels slow", "Very large repo", "Lower maxFilesForAI; set sendSourceCode false; add exclude patterns"],
            ["API error 401", "Bad key", "Clear and re-enter key; verify provider dashboard"],
            ["Timeout", "Network or large payload", "Retry; reduce maxFilesForAI and maxFileSize"],
            ["File will not open from graph", "Path outside workspace or external package", "Only internal project files can open; externals are packages"],
            ["Cache seems stale", "In-memory cache", "Run Refresh Analysis or Clear Project Cache"],
        ],
        [38 * mm, 48 * mm, 84 * mm]
    ))
    story.append(PageBreak())

    # ========== LARGE PROJECTS ==========
    story.append(Paragraph("16. Best Practices for Large Projects", styles["Section"]))
    for item in [
        "Open the correct repository root (the folder that contains package.json or the main source tree).",
        "Rely on default ignore rules; add extra globs under excludePatterns for monorepo noise.",
        "Keep maxFilesForAI at a reasonable value (default 150) so AI context stays focused.",
        "Ask targeted questions about one module or feature instead of “explain everything”.",
        "Re-run <b>Refresh Analysis</b> after large refactors so the map matches the code.",
        "Use Show Dependencies / Dependents on critical files to navigate without the full graph.",
        "For private monorepos, consider sendSourceCode: false and rely on structure + imports.",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(PageBreak())

    # ========== FAQ ==========
    story.append(Paragraph("17. Frequently Asked Questions (FAQ)", styles["Section"]))
    faqs = [
        ("What does this extension do?",
         "It scans your VS Code workspace, builds a dependency picture, and uses AI to produce an architecture map and answers about the codebase."),
        ("Who can use it?",
         "Any developer using VS Code 1.85+ who can open a project folder. AI features need an API key."),
        ("Does it require an API key?",
         "Yes for AI architecture analysis, Explain, and Ask AI. Scanning and a basic local map can work without one."),
        ("Can it analyze large projects?",
         "Yes, with ignore rules and caps on file size and number of files sent to the AI. Extremely large monorepos may need extra exclude patterns."),
        ("Can I ask questions in natural language?",
         "Yes. Use Ask AI About Project and type questions in ordinary English."),
        ("Can I ask about a specific file?",
         "Yes. Open the file and run Explain Current File, or mention the path in an Ask AI question."),
        ("Can I ask about a specific folder?",
         "Yes. Include the folder path in your prompt (for example, “What is the purpose of src/services?”)."),
        ("Can I use it for debugging?",
         "It can suggest likely files and structure-related causes. It does not replace a debugger or test suite."),
        ("Can I refresh the project analysis?",
         "Yes. Run Refresh Analysis or Clear Project Cache then Analyze again."),
        ("Is my source code sent to an AI provider?",
         "Only if sendSourceCode is true (default). You can turn it off to send metadata and dependencies only. .env and secret-like files are never sent."),
        ("Which languages are supported for import analysis?",
         "TypeScript/JavaScript, Python, Java, Go, Rust, and C# have dedicated extractors; other files are listed with limited analysis."),
        ("Does the cache survive VS Code restart?",
         "Not in v0.1.0—the cache is in-memory. Persistent cache is planned (Coming Soon)."),
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>Q: {q}</b>", styles["BodyLeft"]))
        story.append(Paragraph(f"A: {a}", styles["Body"]))
    story.append(PageBreak())

    # ========== TIPS ==========
    story.append(Paragraph("18. Tips for Getting Better Results", styles["Section"]))
    for item in [
        "Ask specific questions and name files or folders.",
        "Give short context (“we use JWT auth”, “this is a Next.js app”) when it is not obvious from the tree.",
        "Ask follow-up questions that build on the previous answer.",
        "Request structured answers (“list five files”, “use bullet points”).",
        "Request step-by-step explanations for onboarding.",
        "After AI points to a file, open it and use Explain Current File for depth.",
        "Keep the webview open while you explore so you can jump between graph and editor.",
        "Check the Output channel “AI Codebase Mapper” if something fails silently.",
    ]:
        story.append(Paragraph(f"• {item}", styles["ManualBullet"]))
    story.append(PageBreak())

    # ========== SUPPORT ==========
    story.append(Paragraph("19. Support &amp; Contact", styles["Section"]))
    story.append(make_table(
        ["Resource", "Value"],
        [
            ["Extension name", "AI Codebase Mapper"],
            ["Version", "0.1.0"],
            ["GitHub repository", "[GITHUB URL]"],
            ["Documentation", "This User Manual + project README.md"],
            ["Issue tracker", "[GITHUB URL]/issues"],
            ["Developer / contact", "[SUPPORT EMAIL]"],
            ["Website", "[WEBSITE URL]"],
            ["VS Code engines", "^1.85.0"],
        ],
        [50 * mm, 120 * mm]
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(
        "When reporting issues, include VS Code version, OS, whether the API key is configured, "
        "and a brief description of the workspace (language, approximate size). Do not paste secrets.",
        styles["Body"]
    ))
    story.append(PageBreak())

    # ========== CHEAT SHEET ==========
    story.append(Paragraph("20. Quick Start Cheat Sheet", styles["Section"]))
    story.append(Paragraph(
        "Keep this page handy for daily use.",
        styles["Body"]
    ))
    cheat = [
        ("Step 1", "Open your project folder in VS Code."),
        ("Step 2", "Command Palette → AI Codebase Mapper: Analyze Project."),
        ("Step 3", "Enter API key if prompted; wait for “AI Map Ready”."),
        ("Step 4", "Open Architecture Map (command or status bar)."),
        ("Step 5", "Explore Architecture, Dependencies, Files, and AI Summary tabs."),
        ("Step 6", "Click a node or file to open it in the editor."),
        ("Step 7", "Ask AI About Project — type a natural-language question."),
        ("Step 8", "Explain Current File for deep dives; Refresh after major changes."),
    ]
    for label, text in cheat:
        story.append(Paragraph(f"<b>{label}:</b> {text}", styles["BodyLeft"]))

    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("<b>Essential commands</b>", styles["Subsection"]))
    story.append(make_table(
        ["Command", "Purpose"],
        [
            ["Analyze Project", "Full scan + AI map"],
            ["Open Architecture Map", "Show webview"],
            ["Refresh Analysis", "Re-scan and re-analyze"],
            ["Explain Current File", "AI explanation of active file"],
            ["Show Dependencies", "Outgoing imports"],
            ["Show Dependents", "Who imports this file"],
            ["Ask AI About Project", "Natural-language Q&amp;A"],
            ["Clear Project Cache", "Drop in-memory snapshot"],
        ],
        [55 * mm, 115 * mm]
    ))
    story.append(PageBreak())

    # ========== CLOSING ==========
    story.append(Paragraph("21. Closing", styles["Section"]))
    story.append(Paragraph(
        "Thank you for using <b>AI Codebase Mapper</b>. We hope it helps you understand your "
        "codebase faster, navigate complex projects more easily, and build better software "
        "with the power of AI.",
        styles["Closing"]
    ))
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="80%", thickness=1, color=BORDER, spaceBefore=10, spaceAfter=10))
    story.append(Paragraph(
        "AI Codebase Mapper v0.1.0 — User Manual<br/>"
        "For updates, issues, and contributions, see [GITHUB URL].",
        ParagraphStyle("end", fontName="Helvetica", fontSize=9, leading=12,
                       textColor=MUTED, alignment=TA_CENTER)
    ))

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="AI Codebase Mapper — User Manual",
        author="AI Codebase Mapper Contributors",
        subject="User Manual & Guide for the AI Codebase Mapper VS Code Extension",
    )
    doc.build(story, onFirstPage=cover_page, onLaterPages=header_footer)
    print(f"Wrote {OUTPUT}")
    return OUTPUT


if __name__ == "__main__":
    build()

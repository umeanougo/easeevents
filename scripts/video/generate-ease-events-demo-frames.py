from __future__ import annotations

import math
import shutil
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "marketing" / "ease-events-demo" / "frames"
WIDTH = 1280
HEIGHT = 720
FPS = 12


def font(size: int, weight: str = "regular") -> ImageFont.FreeTypeFont:
    candidates = {
        "regular": [
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            str(ROOT / "Jost-Medium.ttf"),
        ],
        "bold": [
            str(ROOT / "Jost-Bold.ttf"),
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
        ],
        "mono": [
            str(ROOT / "JBMono.ttf"),
            "/System/Library/Fonts/SFNSMono.ttf",
            "/System/Library/Fonts/Menlo.ttc",
        ],
    }[weight]

    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


F = {
    "xs": font(18),
    "sm": font(22),
    "body": font(27),
    "body_bold": font(27, "bold"),
    "h3": font(32, "bold"),
    "h2": font(44, "bold"),
    "h1": font(68, "bold"),
    "mono": font(18, "mono"),
}

COLORS = {
    "bg": (246, 248, 251),
    "navy": (8, 19, 33),
    "slate": (40, 54, 72),
    "muted": (104, 119, 141),
    "line": (220, 226, 235),
    "white": (255, 255, 255),
    "blue": (43, 105, 235),
    "green": (20, 151, 105),
    "amber": (221, 150, 35),
    "rose": (220, 66, 87),
    "violet": (105, 74, 210),
    "gold": (234, 194, 97),
}


def ease(t: float) -> float:
    return 1 - pow(1 - t, 3)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def rounded(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw: ImageDraw.ImageDraw, xy, value: str, fill, font_obj, anchor=None, spacing=8):
    draw.multiline_text(xy, value, fill=fill, font=font_obj, anchor=anchor, spacing=spacing)


def draw_wrapped(draw: ImageDraw.ImageDraw, xy, value: str, max_chars: int, fill, font_obj, spacing=8):
    text(draw, xy, "\n".join(wrap(value, width=max_chars)), fill, font_obj, spacing=spacing)


def pill(draw, xy, label, fill, fg=(255, 255, 255)):
    x, y = xy
    w = int(draw.textlength(label, font=F["xs"])) + 30
    rounded(draw, (x, y, x + w, y + 32), 16, fill)
    draw.text((x + 15, y + 7), label, fill=fg, font=F["xs"])
    return w


def draw_browser(draw, x, y, w, h, title, url, active_tab="Admin"):
    rounded(draw, (x, y, x + w, y + h), 22, COLORS["white"], COLORS["line"], 2)
    rounded(draw, (x, y, x + w, y + 70), 22, (248, 250, 253), COLORS["line"], 1)
    for i, c in enumerate([(237, 92, 84), (242, 190, 72), (91, 190, 115)]):
        draw.ellipse((x + 26 + i * 24, y + 25, x + 40 + i * 24, y + 39), fill=c)
    tabs = ["Admin", "Planner", "Client", "Vendor"]
    tx = x + 130
    for tab in tabs:
        tw = 82 if tab != "Planner" else 96
        rounded(
            draw,
            (tx, y + 18, tx + tw, y + 50),
            12,
            COLORS["navy"] if tab == active_tab else (235, 239, 246),
        )
        draw.text((tx + 14, y + 25), tab, fill=COLORS["white"] if tab == active_tab else COLORS["muted"], font=F["xs"])
        tx += tw + 8
    if w >= 760:
        rounded(draw, (x + 530, y + 18, x + w - 28, y + 50), 12, COLORS["white"], COLORS["line"], 1)
        draw.text((x + 550, y + 26), url, fill=COLORS["muted"], font=F["xs"])
    else:
        draw.text((x + 28, y + 53), url[:34], fill=COLORS["muted"], font=F["xs"])
    draw.text((x + 28, y + 92), title, fill=COLORS["navy"], font=F["h3"])


def draw_sidebar(draw, x, y, h, active="Dashboard"):
    rounded(draw, (x, y, x + 205, y + h), 16, COLORS["navy"])
    draw.text((x + 24, y + 24), "EaseEvents", fill=COLORS["white"], font=F["body_bold"])
    draw.text((x + 24, y + 56), "Coco Cabana", fill=(159, 176, 200), font=F["xs"])
    items = ["Dashboard", "Leads", "Events", "Tasks", "Budgets", "Vendors", "Clients", "Settings"]
    yy = y + 108
    for item in items:
        is_active = item == active
        rounded(draw, (x + 16, yy, x + 189, yy + 38), 10, (255, 255, 255) if is_active else COLORS["navy"])
        draw.text((x + 34, yy + 9), item, fill=COLORS["navy"] if is_active else (198, 209, 224), font=F["xs"])
        yy += 45


def card(draw, box, title, value, accent=COLORS["blue"]):
    rounded(draw, box, 16, COLORS["white"], COLORS["line"], 1)
    x1, y1, x2, _ = box
    draw.ellipse((x1 + 18, y1 + 20, x1 + 52, y1 + 54), fill=accent)
    draw.text((x1 + 68, y1 + 20), title, fill=COLORS["muted"], font=F["xs"])
    draw.text((x1 + 68, y1 + 47), value, fill=COLORS["navy"], font=F["h3"])


def draw_dashboard(draw, x, y):
    draw_sidebar(draw, x, y, 470, "Dashboard")
    cx = x + 230
    draw.text((cx, y + 8), "Dashboard", fill=COLORS["navy"], font=F["h2"])
    draw.text((cx, y + 60), "Active events, approvals, cash exposure, and delivery risk.", fill=COLORS["muted"], font=F["sm"])
    metrics = [
        ("Active events", "3", COLORS["blue"]),
        ("Unpaid balances", "$67k", COLORS["amber"]),
        ("Approvals", "4", COLORS["violet"]),
        ("Overdue tasks", "1", COLORS["rose"]),
    ]
    for i, (title, value, accent) in enumerate(metrics):
        card(draw, (cx + (i % 2) * 260, y + 112 + (i // 2) * 118, cx + 240 + (i % 2) * 260, y + 212 + (i // 2) * 118), title, value, accent)
    rounded(draw, (cx, y + 365, cx + 520, y + 470), 16, COLORS["white"], COLORS["line"], 1)
    draw.text((cx + 20, y + 385), "Upcoming events", fill=COLORS["navy"], font=F["body_bold"])
    rows = ["Patel Sangeet & Reception  ·  Jun 28", "Rivera Garden Bridal Shower  ·  Jul 12", "Chen Foundation Summer Gala  ·  Aug 9"]
    for i, row in enumerate(rows):
        draw.text((cx + 22, y + 424 + i * 22), row, fill=COLORS["slate"], font=F["xs"])


def draw_budget(draw, x, y):
    draw.text((x, y), "Budget engine", fill=COLORS["navy"], font=F["h2"])
    draw_wrapped(
        draw,
        (x, y + 58),
        "The owner sees planned cost, actual cost, client price, profit, margin, and vendor balances without rebuilding a spreadsheet.",
        58,
        COLORS["muted"],
        F["sm"],
    )
    kpis = [("Planned", "$35.7k"), ("Actual", "$36.8k"), ("Client price", "$42k"), ("Profit", "$5.2k")]
    for i, (a, b) in enumerate(kpis):
        card(draw, (x + i * 210, y + 150, x + i * 210 + 190, y + 250), a, b, [COLORS["blue"], COLORS["amber"], COLORS["navy"], COLORS["green"]][i])
    rounded(draw, (x, y + 285, x + 840, y + 500), 18, COLORS["white"], COLORS["line"], 1)
    headers = ["Category", "Planned", "Actual", "Balance", "Due"]
    cols = [x + 24, x + 330, x + 465, x + 600, x + 720]
    for i, h in enumerate(headers):
        draw.text((cols[i], y + 310), h, fill=COLORS["muted"], font=F["xs"])
    rows = [
        ("Decor", "$9,500", "$10,200", "$5,200", "Jun 20"),
        ("Florals", "$7,800", "$8,200", "$4,700", "Jun 18"),
        ("Catering", "$14,200", "$14,500", "$5,500", "Jun 24"),
        ("Staffing", "$4,200", "$3,900", "$2,700", "Jun 28"),
    ]
    for r, row in enumerate(rows):
        yy = y + 350 + r * 34
        draw.line((x + 20, yy - 8, x + 820, yy - 8), fill=COLORS["line"], width=1)
        for i, cell in enumerate(row):
            draw.text((cols[i], yy), cell, fill=COLORS["navy"] if i == 0 else COLORS["slate"], font=F["xs"])


def draw_pipeline(draw, x, y):
    stages = ["New Inquiry", "Consultation", "Proposal", "Booked", "Lost"]
    draw.text((x, y), "Lead pipeline", fill=COLORS["navy"], font=F["h2"])
    draw.text((x, y + 56), "Inquiry to consultation to proposal to booked event workspace.", fill=COLORS["muted"], font=F["sm"])
    for i, stage in enumerate(stages):
        bx = x + i * 174
        rounded(draw, (bx, y + 130, bx + 158, y + 430), 16, COLORS["white"], COLORS["line"], 1)
        draw.text((bx + 14, y + 150), stage, fill=COLORS["navy"], font=F["xs"])
    leads = [
        (0, "Grace Wilson", "Birthday dinner", "$12k-$18k"),
        (1, "Jordan Miles", "Engagement", "$25k-$35k"),
        (2, "Amara Cole", "Brand launch", "$45k-$60k"),
        (3, "Nisha Patel", "Sangeet", "$40k-$55k"),
    ]
    for col, name, typ, budget in leads:
        bx = x + col * 174 + 14
        yy = y + 195
        rounded(draw, (bx, yy, bx + 130, yy + 92), 12, (248, 250, 253), COLORS["line"], 1)
        draw.text((bx + 12, yy + 12), name, fill=COLORS["navy"], font=F["xs"])
        draw.text((bx + 12, yy + 38), typ, fill=COLORS["muted"], font=F["xs"])
        draw.text((bx + 12, yy + 64), budget, fill=COLORS["blue"], font=F["xs"])
    draw.line((x + 620, y + 485, x + 760, y + 485), fill=COLORS["green"], width=5)
    draw.polygon([(x + 760, y + 485), (x + 740, y + 474), (x + 740, y + 496)], fill=COLORS["green"])
    draw.text((x + 435, y + 470), "Convert lead to event", fill=COLORS["green"], font=F["body_bold"])


def draw_client_portal(draw, x, y):
    draw.text((x, y), "Client portal", fill=COLORS["navy"], font=F["h2"])
    draw.text((x, y + 56), "Clients see only their event, timeline, files, invoices, and approvals.", fill=COLORS["muted"], font=F["sm"])
    rounded(draw, (x, y + 120, x + 840, y + 500), 18, COLORS["white"], COLORS["line"], 1)
    draw.text((x + 28, y + 146), "Patel Sangeet & Reception", fill=COLORS["navy"], font=F["h3"])
    facts = [("Event date", "Jun 28, 2026"), ("Location", "Arlington Estate"), ("Guests", "260"), ("Status", "Awaiting approval")]
    for i, (label, value) in enumerate(facts):
        bx = x + 28 + (i % 2) * 390
        by = y + 210 + (i // 2) * 70
        draw.text((bx, by), label.upper(), fill=COLORS["muted"], font=F["xs"])
        draw.text((bx, by + 24), value, fill=COLORS["navy"], font=F["body_bold"])
    approvals = ["Final budget and variance approval", "Production timeline", "Moodboard placeholder", "Proposal placeholder"]
    for i, item in enumerate(approvals):
        yy = y + 370 + i * 32
        draw.ellipse((x + 28, yy, x + 48, yy + 20), fill=COLORS["green"] if i > 1 else COLORS["amber"])
        draw.text((x + 62, yy - 2), item, fill=COLORS["slate"], font=F["xs"])


def draw_role_tabs(draw, x, y):
    draw.text((x, y), "Demo with multiple roles", fill=COLORS["navy"], font=F["h2"])
    draw_wrapped(
        draw,
        (x, y + 58),
        "Use separate tabs to show how the same platform changes by role: owner, planner, client, and vendor.",
        46,
        COLORS["muted"],
        F["sm"],
    )
    roles = [
        ("Admin / owner", "Command center, budget margin, approvals", COLORS["navy"]),
        ("Planner", "Tasks, execution, event workspaces", COLORS["blue"]),
        ("Client", "Own event, files, approvals, invoices", COLORS["green"]),
        ("Vendor", "Relevant event details and coordination", COLORS["violet"]),
    ]
    for i, (role, desc, color) in enumerate(roles):
        bx = x
        by = y + 142 + i * 84
        rounded(draw, (bx, by, bx + 520, by + 68), 18, COLORS["white"], COLORS["line"], 1)
        draw.ellipse((bx + 22, by + 18, bx + 54, by + 50), fill=color)
        draw.text((bx + 74, by + 13), role, fill=COLORS["navy"], font=F["body_bold"])
        draw.text((bx + 74, by + 43), desc, fill=COLORS["muted"], font=F["xs"])


def draw_event_workspace(draw, x, y):
    draw.text((x, y), "Event workspace", fill=COLORS["navy"], font=F["h2"])
    draw.text((x, y + 56), "One place for overview, tasks, budget, vendors, files, approvals, and future AI.", fill=COLORS["muted"], font=F["sm"])
    tabs = ["Overview", "Tasks", "Budget", "Vendors", "Files", "Approvals", "AI"]
    tx = x
    for i, tab in enumerate(tabs):
        w = int(draw.textlength(tab, font=F["xs"])) + 32
        rounded(draw, (tx, y + 122, tx + w, y + 160), 12, COLORS["navy"] if i == 2 else COLORS["white"], COLORS["line"], 1)
        draw.text((tx + 16, y + 132), tab, fill=COLORS["white"] if i == 2 else COLORS["slate"], font=F["xs"])
        tx += w + 10
    rounded(draw, (x, y + 190, x + 840, y + 500), 18, COLORS["white"], COLORS["line"], 1)
    draw.text((x + 28, y + 216), "Patel Sangeet & Reception", fill=COLORS["navy"], font=F["h3"])
    pill(draw, (x + 570, y + 218), "Awaiting Client Approval", COLORS["amber"])
    draw.text((x + 28, y + 274), "Timeline", fill=COLORS["muted"], font=F["xs"])
    draw_wrapped(draw, (x + 28, y + 304), "Vendor load-in begins at 8:00 AM. Client reveal targeted for 4:15 PM before guest arrival.", 68, COLORS["slate"], F["sm"])
    draw.text((x + 28, y + 392), "Internal notes", fill=COLORS["muted"], font=F["xs"])
    draw_wrapped(draw, (x + 28, y + 422), "Warm modern palette with high-impact florals. Confirm rain plan with venue.", 70, COLORS["slate"], F["sm"])


def draw_close(draw, x, y):
    draw.text((x, y), "Strong close", fill=COLORS["navy"], font=F["h2"])
    draw_wrapped(
        draw,
        (x, y + 72),
        "EaseEvents already shows the operating model: inquiry, booking, workspace, budget control, vendor coordination, tasks, files, client approvals, and reporting.",
        50,
        COLORS["slate"],
        F["body"],
        spacing=10,
    )
    draw_wrapped(
        draw,
        (x, y + 245),
        "Next decision: which production slice should Coco Cabana prioritize first: client portal, budget engine, or lead-to-event workflow?",
        54,
        COLORS["muted"],
        F["sm"],
    )
    pill(draw, (x, y + 370), "Client portal", COLORS["green"])
    pill(draw, (x + 160, y + 370), "Budget engine", COLORS["blue"])
    pill(draw, (x + 335, y + 370), "Lead-to-event workflow", COLORS["violet"])


SCENES = [
    {
        "duration": 4.5,
        "caption": "Open with the replacement story: HoneyBook, Trello, Sheets, Drive, and manual approvals become one Coco Cabana workspace.",
        "draw": "title",
    },
    {"duration": 5.0, "caption": "Set up four tabs so they can see each user’s experience side by side.", "draw": "roles"},
    {"duration": 5.5, "caption": "Start with the owner dashboard: risk, revenue, approvals, overdue work, and upcoming events.", "draw": "dashboard"},
    {"duration": 5.5, "caption": "Open the event workspace and show the single source of truth for execution.", "draw": "workspace"},
    {"duration": 6.0, "caption": "Spend extra time on the budget engine. This is the differentiator.", "draw": "budget"},
    {"duration": 5.5, "caption": "Move to the CRM pipeline and show how a booked lead becomes an event workspace.", "draw": "pipeline"},
    {"duration": 5.5, "caption": "Switch to the client tab. The client only sees their event, approvals, files, and invoice placeholder.", "draw": "client"},
    {"duration": 4.5, "caption": "Close with next-phase choices: portal, budget engine, or lead-to-event workflow.", "draw": "close"},
]


def draw_background(progress: float) -> Image.Image:
    im = Image.new("RGB", (WIDTH, HEIGHT), COLORS["bg"])
    draw = ImageDraw.Draw(im)
    for i in range(0, WIDTH, 48):
        shade = 232 + int(8 * math.sin((i / 60) + progress * 8))
        draw.line((i, 0, i, HEIGHT), fill=(shade, shade + 2, min(255, shade + 6)), width=1)
    draw.ellipse((-180, -220, 520, 420), fill=(231, 238, 255))
    draw.ellipse((930, 480, 1450, 920), fill=(239, 246, 241))
    return im


def render_scene(draw: ImageDraw.ImageDraw, scene_name: str, local_t: float):
    x = 86
    y = 72
    if scene_name == "title":
        draw.text((x, y + 30), "EaseEvents", fill=COLORS["navy"], font=F["h1"])
        draw.text((x, y + 118), "Demo walkthrough for Coco Cabana", fill=COLORS["slate"], font=F["h2"])
        draw_wrapped(
            draw,
            (x, y + 190),
            "A branded event operations platform for leads, events, budgets, vendors, tasks, client approvals, files, and reporting.",
            60,
            COLORS["muted"],
            F["body"],
            spacing=10,
        )
        draw_browser(draw, 670, 82, 520, 480, "Admin dashboard", "localhost:8080/ease-events", "Admin")
        draw_dashboard(draw, 700, 170)
    elif scene_name == "roles":
        draw_role_tabs(draw, x, y)
        draw_browser(draw, 675, 90, 500, 430, "Four role tabs", "owner / planner / client / vendor", "Admin")
    elif scene_name == "dashboard":
        draw_browser(draw, 86, 78, 1090, 535, "Admin dashboard", "localhost:8080/ease-events", "Admin")
        draw_dashboard(draw, 120, 170)
    elif scene_name == "workspace":
        draw_browser(draw, 86, 78, 1090, 535, "Patel event workspace", "/ease-events/events/event-patel-sangeet", "Admin")
        draw_event_workspace(draw, 130, 170)
    elif scene_name == "budget":
        draw_browser(draw, 86, 78, 1090, 535, "Budget tab", "/ease-events/events/.../budget", "Admin")
        draw_budget(draw, 130, 170)
    elif scene_name == "pipeline":
        draw_browser(draw, 86, 78, 1090, 535, "Lead pipeline", "/ease-events/leads", "Admin")
        draw_pipeline(draw, 130, 170)
    elif scene_name == "client":
        draw_browser(draw, 86, 78, 1090, 535, "Client portal", "/ease-events/client-portal", "Client")
        draw_client_portal(draw, 130, 170)
    elif scene_name == "close":
        draw_close(draw, x, y + 20)


def draw_caption(draw: ImageDraw.ImageDraw, caption: str, scene_idx: int, total_scenes: int):
    rounded(draw, (70, 624, 1210, 694), 20, COLORS["navy"])
    draw.text((98, 642), f"{scene_idx + 1}/{total_scenes}", fill=COLORS["gold"], font=F["mono"])
    draw_wrapped(draw, (168, 640), caption, 92, COLORS["white"], F["sm"], spacing=6)


def main():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    frame_index = 0
    total_scenes = len(SCENES)
    for scene_idx, scene in enumerate(SCENES):
        frames = int(scene["duration"] * FPS)
        for local_frame in range(frames):
            t = local_frame / max(frames - 1, 1)
            im = draw_background((frame_index / FPS) / 40)
            overlay = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)
            alpha = int(255 * min(ease(min(t * 3, 1)), ease(min((1 - t) * 4, 1))))
            content = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 0))
            cdraw = ImageDraw.Draw(content)
            render_scene(cdraw, scene["draw"], t)
            content.putalpha(alpha)
            overlay.alpha_composite(content)
            draw = ImageDraw.Draw(overlay)
            draw_caption(draw, scene["caption"], scene_idx, total_scenes)
            im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
            im.save(OUT_DIR / f"frame_{frame_index:05d}.png", quality=92)
            frame_index += 1

    print(f"frames={frame_index}")
    print(f"fps={FPS}")
    print(f"frames_dir={OUT_DIR}")


if __name__ == "__main__":
    main()

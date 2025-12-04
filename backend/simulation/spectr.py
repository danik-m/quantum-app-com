# periodic_orbitals_app.py

# --- ВИПРАВЛЕНО: Видалено помилковий імпорт з curses ---
# from curses import A_COLOR, COLORS  <-- ЦЕ БУЛО ПОМИЛКОЮ

from matplotlib.patches import Rectangle
import streamlit as st
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import time
from math import floor

# --- ДОДАНО: Визначення кольорів для орбіталей ---
COLORS = {
    's': '#ff9999',  # Червонуватий
    'p': '#ffcc99',  # Помаранчевий
    'd': '#99ccff',  # Блакитний
    'f': '#99ff99'   # Зелений
}

st.set_page_config(layout="wide", page_title="Periodic Table — Orbital Animator", page_icon="🔬")

# === Цветовая палитра сайта ===
BG_COLOR = "#0e1117"
TEXT_COLOR = "white"
BOX_BG = "#11151c"

# === Модули, которые используются в GIF-анимации ===
import io
import imageio

# === Импорт построения орбиталей ===
# Если они находятся в modules/orbitals.py — укажи правильный путь
try:
    from modules.orbitals import AUFBAU, parse_orb, draw_orbital_diagram
except ImportError:
    # Временно заглушки, чтобы не было ошибок Pylance
    AUFBAU = {}
    def parse_orb(*args, **kwargs): return None
    def draw_orbital_diagram(*args, **kwargs): return None

# --------------------------
# 1) ДАННЫЕ ЭЛЕМЕНТОВ (1..118)
#    minimal: atomic number, symbol, name, period, group
# --------------------------
# source: standard element symbols & names (1..118)
ELEMENTS = [
    (1, "H", "Hydrogen"),
    (2, "He", "Helium"),
    (3, "Li", "Lithium"),
    (4, "Be", "Beryllium"),
    (5, "B", "Boron"),
    (6, "C", "Carbon"),
    (7, "N", "Nitrogen"),
    (8, "O", "Oxygen"),
    (9, "F", "Fluorine"),
    (10, "Ne", "Neon"),
    (11, "Na", "Sodium"),
    (12, "Mg", "Magnesium"),
    (13, "Al", "Aluminium"),
    (14, "Si", "Silicon"),
    (15, "P", "Phosphorus"),
    (16, "S", "Sulfur"),
    (17, "Cl", "Chlorine"),
    (18, "Ar", "Argon"),
    (19, "K", "Potassium"),
    (20, "Ca", "Calcium"),
    (21, "Sc", "Scandium"),
    (22, "Ti", "Titanium"),
    (23, "V", "Vanadium"),
    (24, "Cr", "Chromium"),
    (25, "Mn", "Manganese"),
    (26, "Fe", "Iron"),
    (27, "Co", "Cobalt"),
    (28, "Ni", "Nickel"),
    (29, "Cu", "Copper"),
    (30, "Zn", "Zinc"),
    (31, "Ga", "Gallium"),
    (32, "Ge", "Germanium"),
    (33, "As", "Arsenic"),
    (34, "Se", "Selenium"),
    (35, "Br", "Bromine"),
    (36, "Kr", "Krypton"),
    (37, "Rb", "Rubidium"),
    (38, "Sr", "Strontium"),
    (39, "Y", "Yttrium"),
    (40, "Zr", "Zirconium"),
    (41, "Nb", "Niobium"),
    (42, "Mo", "Molybdenum"),
    (43, "Tc", "Technetium"),
    (44, "Ru", "Ruthenium"),
    (45, "Rh", "Rhodium"),
    (46, "Pd", "Palladium"),
    (47, "Ag", "Silver"),
    (48, "Cd", "Cadmium"),
    (49, "In", "Indium"),
    (50, "Sn", "Tin"),
    (51, "Sb", "Antimony"),
    (52, "Te", "Tellurium"),
    (53, "I", "Iodine"),
    (54, "Xe", "Xenon"),
    (55, "Cs", "Caesium"),
    (56, "Ba", "Barium"),
    (57, "La", "Lanthanum"),
    (58, "Ce", "Cerium"),
    (59, "Pr", "Praseodymium"),
    (60, "Nd", "Neodymium"),
    (61, "Pm", "Promethium"),
    (62, "Sm", "Samarium"),
    (63, "Eu", "Europium"),
    (64, "Gd", "Gadolinium"),
    (65, "Tb", "Terbium"),
    (66, "Dy", "Dysprosium"),
    (67, "Ho", "Holmium"),
    (68, "Er", "Erbium"),
    (69, "Tm", "Thulium"),
    (70, "Yb", "Ytterbium"),
    (71, "Lu", "Lutetium"),
    (72, "Hf", "Hafnium"),
    (73, "Ta", "Tantalum"),
    (74, "W", "Tungsten"),
    (75, "Re", "Rhenium"),
    (76, "Os", "Osmium"),
    (77, "Ir", "Iridium"),
    (78, "Pt", "Platinum"),
    (79, "Au", "Gold"),
    (80, "Hg", "Mercury"),
    (81, "Tl", "Thallium"),
    (82, "Pb", "Lead"),
    (83, "Bi", "Bismuth"),
    (84, "Po", "Polonium"),
    (85, "At", "Astatine"),
    (86, "Rn", "Radon"),
    (87, "Fr", "Francium"),
    (88, "Ra", "Radium"),
    (89, "Ac", "Actinium"),
    (90, "Th", "Thorium"),
    (91, "Pa", "Protactinium"),
    (92, "U", "Uranium"),
    (93, "Np", "Neptunium"),
    (94, "Pu", "Plutonium"),
    (95, "Am", "Americium"),
    (96, "Cm", "Curium"),
    (97, "Bk", "Berkelium"),
    (98, "Cf", "Californium"),
    (99, "Es", "Einsteinium"),
    (100, "Fm", "Fermium"),
    (101, "Md", "Mendelevium"),
    (102, "No", "Nobelium"),
    (103, "Lr", "Lawrencium"),
    (104, "Rf", "Rutherfordium"),
    (105, "Db", "Dubnium"),
    (106, "Sg", "Seaborgium"),
    (107, "Bh", "Bohrium"),
    (108, "Hs", "Hassium"),
    (109, "Mt", "Meitnerium"),
    (110, "Ds", "Darmstadtium"),
    (111, "Rg", "Roentgenium"),
    (112, "Cn", "Copernicium"),
    (113, "Nh", "Nihonium"),
    (114, "Fl", "Flerovium"),
    (115, "Mc", "Moscovium"),
    (116, "Lv", "Livermorium"),
    (117, "Ts", "Tennessine"),
    (118, "Og", "Oganesson"),
]

# Map atomic number -> data dict for easy lookup
ELEMENT_LOOKUP = {Z: {"Z": Z, "symbol": sym, "name": name} for (Z, sym, name) in ELEMENTS}

# approximate period & group placement for click-panel (we'll compute a simple map)
# Minimal mapping to display in periodic grid (periods 1..7, groups 1..18) for layout
# We'll create a simple 2D layout array with symbols or empty.
# Standard periodic table template (period x group) simplified coordinates for first 18 columns.
PERIODIC_LAYOUT = [[None for _ in range(18)] for _ in range(7)]
# manual placement for 1..36 (first 4 periods) common layout:
placement = {
    1: (1, 1), 2: (1, 18),
    3: (2, 1), 4: (2, 2), 5: (2, 13), 6: (2, 14), 7: (2, 15), 8: (2, 16), 9: (2, 17), 10: (2, 18),
    # Using standard full mapping is long — we'll construct a general algorithmic layout instead below.
}
# We'll instead generate layout using standard rules: for simplicity show a compact grid of 7 rows x 18 cols
# We'll place symbols by known period/group mapping using a lightweight algorithm:
# We'll use known group assignments for main-block up to 36; for 37..54 etc mapping continues.
# To avoid enormous mapping errors, display a clickable list of elements on left and a visual grid with symbols approximated.

# --------------------------
# 2) ORBITAL SEQUENCE (Aufbau) and utilities
# --------------------------
# Define subshells with (n,l,label,capacity)
SUBSHELL_ORDER = [
    (1, 's'), (2, 's'), (2, 'p'), (3, 's'), (3, 'p'),
    (4, 's'), (3, 'd'), (4, 'p'), (5, 's'), (4, 'd'),
    (5, 'p'), (6, 's'), (4, 'f'), (5, 'd'), (6, 'p'),
    (7, 's'), (5, 'f'), (6, 'd'), (7, 'p'),
    # covers up to 7p (sufficient for Z<=118)
]
CAPACITY = {'s':2, 'p':6, 'd':10, 'f':14}

def orbital_label(n, subshell):
    return f"{n}{subshell}"

def build_orbital_list():
    """Return list of orbital labels in proper Aufbau order for Z up to 118"""
    labels = []
    # Create list using n+l rule programmatically for n up to 7 and l in s(0),p(1),d(2),f(3)
    # Compose candidate orbitals
    candidates = []
    for n in range(1, 8):
        for l, letter in enumerate(['s','p','d','f']):
            # only include if plausible (n for f must be >=4, d>=3, p>=2)
            if (letter == 's' and n>=1) or (letter=='p' and n>=2) or (letter=='d' and n>=3) or (letter=='f' and n>=4):
                candidates.append((n,letter))
    # sort by n+l, tie-break by lower n
    candidates_sorted = sorted(candidates, key=lambda x: (x[0] + {'s':0,'p':1,'d':2,'f':3}[x[1]], x[0]))
    # Keep only orbitals up to 7p roughly
    keep = []
    for (n, letter) in candidates_sorted:
        lab = orbital_label(n, letter)
        keep.append(lab)
    # sometimes ordering duplicates earlier list, but this simple sorted list follows n+l rule
    return keep

AUFBAU_LIST = build_orbital_list()

# For reference print: AUFBAU_LIST
# --------------------------
# electron filling function
# --------------------------
def electron_configuration(Z):
    """Return config list of tuples (orbital_label, electrons, capacity)."""
    remaining = Z
    config = []
    for orb in AUFBAU_LIST:
        n = int(orb[0])
        subshell = orb[1]
        cap = CAPACITY[subshell]
        if remaining <= 0:
            break
        elec = min(cap, remaining)
        config.append({"orbital": orb, "n": n, "subshell": subshell, "electrons": elec, "capacity": cap})
        remaining -= elec
    return config

# -----------------------------
# Drawing one frame (static)
# -----------------------------
def draw_frame(config, title=None, figsize=(10,5)):
    """
    Draw a static diagram similar to second screenshot:
    boxes per orbital with small slots for electrons.
    Returns matplotlib Figure.
    """
    # Layout parameters
    cols = ["s", "p", "d", "f"]
    # set of n present
    n_vals = sorted({c["n"] for c in config}, reverse=True)  # show higher n on top
    n_vals = [n for n in n_vals if n >= 1]
    # position map
    spacing_x = 1.4
    spacing_y = 1.0
    x0 = 0.5
    y0 = 0.5

    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis("off")

    # draw each orbital row
    for i, n in enumerate(n_vals):
        for j, col in enumerate(cols):
            # find orbital in config with this (n, col)
            found = None
            for c in config:
                if c["n"] == n and c["subshell"] == col:
                    found = c
                    break
            # compute center position
            x = x0 + j * spacing_x
            y = y0 + i * spacing_y
            if found is None:
                # draw empty placeholder small rectangle to keep grid visible
                rect_bg = Rectangle((x-0.45, y-0.25), 0.9, 0.6, facecolor="#0f1418", edgecolor="#2a2a2a", lw=0.8)
                ax.add_patch(rect_bg)
                continue

            cap = found["capacity"]
            elec = found["electrons"]
            # big background colored by block
            block_color = COLORS.get(found["subshell"], "#333333")
            big_rect = Rectangle((x-0.9, y-0.5), 1.8, 0.9, facecolor=block_color, alpha=0.12, edgecolor=None)
            ax.add_patch(big_rect)

            # orbital label (left)
            ax.text(x-1.05, y+0.18, f"{found['orbital']}", color=TEXT_COLOR, fontsize=9, weight="bold", va="center")

            # draw small slots for each capacity as narrow rectangles
            slot_w = 0.14
            slot_h = 0.45
            total_w = cap * slot_w
            start_x = x - total_w/2.0
            # ensure slots are visible even for large cap by limiting width
            for s in range(cap):
                sx = start_x + s * slot_w
                sy = y - slot_h/2.0
                sl_rect = Rectangle((sx, sy), slot_w*0.9, slot_h, facecolor=BOX_BG, edgecolor="#444444", lw=0.7)
                ax.add_patch(sl_rect)
                # draw electron indicator if s < elec
                if s < elec:
                    # render as small up/down arrows: for visual clarity draw small triangle (arrow) filled cyan
                    ax.annotate("", xy=(sx + 0.09*slot_w, sy + slot_h*0.7), xytext=(sx + 0.09*slot_w, sy + slot_h*0.3),
                                arrowprops=dict(arrowstyle="-|>", color="#00ffff", lw=1.6))
    # title and legend
    ax.set_title(title or "Electron configuration (Aufbau)", color=TEXT_COLOR, pad=12)
    # legend boxes
    ax.text(0.2, -0.6, "s block", color=TEXT_COLOR, bbox=dict(facecolor=COLORS['s'], alpha=0.85), fontsize=9)
    ax.text(1.8, -0.6, "p block", color=TEXT_COLOR, bbox=dict(facecolor=COLORS['p'], alpha=0.85), fontsize=9)
    ax.text(3.5, -0.6, "d block", color=TEXT_COLOR, bbox=dict(facecolor=COLORS['d'], alpha=0.85), fontsize=9)
    ax.text(5.0, -0.6, "f block", color=TEXT_COLOR, bbox=dict(facecolor=COLORS['f'], alpha=0.85), fontsize=9)

    fig.tight_layout()
    return fig

# -----------------------------
# Create GIF from frames (in-memory)
# -----------------------------
def make_gif_frames(config_sequence, title_template, fps=10):
    """
    config_sequence: list of configs (list-of-dicts) to render per frame
    Returns bytes of GIF
    """
    frames = []
    for idx, cfg in enumerate(config_sequence):
        fig = draw_frame(cfg, title=title_template.format(step=idx+1, total=len(config_sequence)))
        # convert fig to RGB ndarray
        buf = io.BytesIO()
        fig.savefig(buf, format="png", facecolor=fig.get_facecolor(), dpi=100)
        plt.close(fig)
        buf.seek(0)
        img = imageio.v2.imread(buf)
        frames.append(img)
    # generate gif bytes
    gif_buf = io.BytesIO()
    imageio.mimsave(gif_buf, frames, format="GIF", fps=fps)
    gif_buf.seek(0)
    return gif_buf.read()

# -----------------------------
# Build incremental filling sequence
# -----------------------------
def build_incremental_configs(Z):
    """Return list of incremental configs for animation: each frame shows filling up to a step."""
    configs = []
    # create a running fill: at each step change electron numbers progressively.
    remaining = Z
    full_cfg_template = []
    for orb in AUFBAU_LIST:
        n = int(orb[0])
        subshell = orb[1]
        cap = CAPACITY[subshell]
        full_cfg_template.append({"orbital": orb, "n": n, "subshell": subshell, "capacity": cap}) # Fixed: added capacity here
    # for each orbital in AUFBAU fill it step by step (per electron)
    remaining_total = Z
    # frames: after placing each electron create a frame
    electron_positions = []  # list of (orb_index, electrons_filled_in_that_orb) per electron
    # generate electron distribution counts per orbital sequentially
    counts = [0]*len(full_cfg_template)
    rem = Z
    for i, entry in enumerate(full_cfg_template):
        if rem <= 0: break
        to = min(entry["capacity"], rem)
        counts[i] = to
        rem -= to
    # Now make frames where electrons are progressively filled from orb0..orbN
    # We'll append frames where a partial orbital filling increases by 1 electron each
    # copy baseline counts but for each orb produce intermediate frames
    for i in range(len(full_cfg_template)):
        cap = full_cfg_template[i]["capacity"]
        target = counts[i]
        if target == 0:
            # still include a frame that shows 0 in this orbital (i.e., previous state) - not necessary
            continue
        # for each electron index from 1..target create a frame snapshot where this orb has 'k' electrons
        for k in range(1, target+1):
            # build config snapshot
            cfg_snapshot = []
            for j in range(len(full_cfg_template)):
                elec = counts[j] if j < i else 0  # default: earlier orbitals fully filled, later empty
                # but for current orbital i, set elec=k
                if j < i:
                    elec = counts[j]
                elif j == i:
                    elec = k
                else:
                    elec = 0
                ent = full_cfg_template[j].copy()
                ent["electrons"] = elec
                ent["elec"] = elec # Compatible with draw_frame which uses 'elec'
                ent["orb"] = ent["orbital"] # Compatible with draw_frame which uses 'orb'
                ent["cap"] = ent["capacity"] # Compatible with draw_frame which uses 'cap'
                cfg_snapshot.append(ent)
            configs.append(cfg_snapshot)
    # If Z is small such that no frames produced, provide at least final config
    if len(configs) == 0:
        configs.append([ {**e, "elec": (min(e["capacity"], Z) if Z>0 else 0), "electrons": (min(e["capacity"], Z) if Z>0 else 0), "orb": e["orbital"], "cap": e["capacity"]} for e in full_cfg_template ])
    return configs

# --------------------------
# 4) Streamlit UI
# --------------------------
st.title("🔬 Periodic Table — Orbital Animation")
st.markdown("Выберите элемент, чтобы увидеть его электронную конфигурацию и анимацию заполнения уровней (Aufbau).")

left_col, right_col = st.columns([1, 2])

with left_col:
    st.header("Элементы")
    # Quick controls: search and selector
    q = st.text_input("Поиск (символ/имя/номер)", value="")
    # Build list of display strings
    display_list = []
    for Z, sym, name in ELEMENTS:
        s = f"{Z} {sym} - {name}"
        if q.strip() == "" or q.strip().lower() in s.lower():
            display_list.append((s, Z))
    # create a scrollable list using selectbox
    selection_strs = [d[0] for d in display_list]
    selection_vals = [d[1] for d in display_list]
    if selection_strs:
        sel_idx = st.selectbox("Выберите элемент", options=list(range(len(selection_strs))),
                               format_func=lambda i: selection_strs[i], index=0)
        selected_Z = selection_vals[sel_idx]
    else:
        st.write("Ничего не найдено")
        selected_Z = 1

    st.markdown("---")
    st.subheader("Быстрые кнопки")
    col_a, col_b = st.columns(2)
    with col_a:
        if st.button("H"):
            selected_Z = 1
    with col_b:
        if st.button("He"):
            selected_Z = 2

    st.markdown("Информация об элементе:")
    data = ELEMENT_LOOKUP[selected_Z]
    st.metric("Атомный номер", selected_Z)
    st.metric("Символ", data['symbol'])
    st.write(f"Название: **{data['name']}**")
    # placeholder for period/group (simple estimate)
    est_period = 1 + (selected_Z>2) + (selected_Z>10) + (selected_Z>18) + (selected_Z>36) + (selected_Z>54) + (selected_Z>86)
    st.write(f"Период (приблизительно): {est_period}")

    st.markdown("---")
    # Buttons to show orbitals
    if 'anim_step' not in st.session_state:
        st.session_state['anim_step'] = 0
    if 'anim_running' not in st.session_state:
        st.session_state['anim_running'] = False

    if st.button("Показать уровни (конфигурация)"):
        st.session_state['show_levels'] = True

    if st.button("Сброс анимации"):
        st.session_state['anim_step'] = 0
        st.session_state['anim_running'] = False

    if st.checkbox("Авто-анимация при показе", value=True):
        st.session_state['auto_play'] = True
    else:
        st.session_state['auto_play'] = False

with right_col:
    st.header("Визуализация уровней")
    # Compute electron configuration
    cfg = electron_configuration(selected_Z)
    cfg_summary = ", ".join([f"{c['orbital']}^{c['electrons']}" for c in cfg])
    st.write(f"Полная конфигурация (по Авфбау): **{cfg_summary}**")
    # show diagram when requested
    show = st.session_state.get('show_levels', True)

    diagram_placeholder = st.empty()

    if show:
        # if auto_play — animate
        if st.session_state.get('auto_play', True):
            # animate filling step-by-step
            incremental_configs = build_incremental_configs(selected_Z)
            
            play_button = st.button("Play animation")
            stop_button = st.button("Stop")
            if play_button:
                st.session_state['anim_running'] = True
            if stop_button:
                st.session_state['anim_running'] = False
            # run loop (will block UI while running) — but acceptable for short animations
            if st.session_state['anim_running']:
                for frame_idx in range(len(incremental_configs)):
                    fig = draw_frame(incremental_configs[frame_idx], title=f"Z={selected_Z}  step {frame_idx+1}/{len(incremental_configs)}", figsize=(12,6))
                    diagram_placeholder.pyplot(fig)
                    time.sleep(0.08)
                    if not st.session_state['anim_running']:
                        break
                st.session_state['anim_running'] = False
            else:
                # show final static diagram
                # Need to adapt cfg to have keys needed by draw_frame (elec, cap, orb)
                cfg_adapted = [ {**c, "elec": c["electrons"], "cap": c["capacity"], "orb": c["orbital"]} for c in cfg ]
                fig = draw_frame(cfg_adapted, title=f"{selected_Z} {data['symbol']} — Z={selected_Z}", figsize=(12,6))
                diagram_placeholder.pyplot(fig)
        else:
            # static render / allow step control
            step = st.slider("Шаг анимации (ручной)", 0, len(AUFBAU_LIST), st.session_state.get('anim_step', 0))
            st.session_state['anim_step'] = step
            # generate config for step
            remaining = selected_Z
            conf = []
            for i, orb in enumerate(AUFBAU_LIST):
                n = int(orb[0]); subshell = orb[1]; cap = CAPACITY[subshell]
                if remaining <= 0:
                    elec = 0
                else:
                    elec = min(cap, remaining)
                conf.append({"orbital": orb, "n": n, "subshell": subshell, "electrons": elec, "capacity": cap, "elec": elec, "cap": cap, "orb": orb})
                remaining -= elec
            fig = draw_frame(conf, title=f"{selected_Z} {data['symbol']} — manual", figsize=(12,6))
            diagram_placeholder.pyplot(fig)

    st.markdown("---")
    st.subheader("Информация/примечания")
    st.write("""
    - Схема уровней строится по правилу n+l (Aufbau). Корректность для переходных элементов/исключений (например Cr, Cu) может требовать ручной коррекции — это можно добавить отдельно.
    - Для более точных диаграмм (с отображением реальных орбит и узлов) требуется решение Шредингера; здесь показана учебная схема заполнения электронных слоёв.
    - Hover-информация заменена быстрым выбором элемента.
    """)

# --------------------------
# 5) OPTIONAL: show full periodic grid (approximated)
# --------------------------
st.markdown("---")
st.header("Интерактивная таблица Менделеева (кликните элемент)")

def render_periodic_grid():
    # simple grid 7 rows x 18 cols; place elements by approximate standard table indexing
    # We'll use a mapping of atomic numbers to (period, group) for placement (minimal reliable mapping)
    # Precomputed coordinates for 1..36 (4 periods) — reliable
    coords_pre = {
        1:(1,1), 2:(1,18),
        3:(2,1),4:(2,2),5:(2,13),6:(2,14),7:(2,15),8:(2,16),9:(2,17),10:(2,18),
        11:(3,1),12:(3,2),13:(3,13),14:(3,14),15:(3,15),16:(3,16),17:(3,17),18:(3,18),
        19:(4,1),20:(4,2),21:(4,3),22:(4,4),23:(4,5),24:(4,6),25:(4,7),26:(4,8),27:(4,9),28:(4,10),
        29:(4,11),30:(4,12),31:(4,13),32:(4,14),33:(4,15),34:(4,16),35:(4,17),36:(4,18)
    }
    # 37..54 (period 5)
    coords_pre.update({
        37:(5,1),38:(5,2),39:(5,3),40:(5,4),41:(5,5),42:(5,6),43:(5,7),44:(5,8),45:(5,9),46:(5,10),
        47:(5,11),48:(5,12),49:(5,13),50:(5,14),51:(5,15),52:(5,16),53:(5,17),54:(5,18)
    })
    # 55..86 (period 6) including lanthanides block (we place La at 6,3 and put extra row for lanth)
    coords_pre.update({
        55:(6,1),56:(6,2),57:(6,3),58:(9,4),59:(9,5),60:(9,6),61:(9,7),62:(9,8),63:(9,9),64:(9,10),
        65:(9,11),66:(9,12),67:(9,13),68:(9,14),69:(9,15),70:(9,16),71:(6,4),72:(6,5),73:(6,6),74:(6,7),
        75:(6,8),76:(6,9),77:(6,10),78:(6,11),79:(6,12),80:(6,13),81:(6,14),82:(6,15),83:(6,16),84:(6,17),85:(6,18)
    })
    # 87..118 (period 7) actinides in row 10
    coords_pre.update({
        87:(7,1),88:(7,2),89:(7,3),90:(10,4),91:(10,5),92:(10,6),93:(10,7),94:(10,8),95:(10,9),96:(10,10),
        97:(10,11),98:(10,12),99:(10,13),100:(10,14),101:(10,15),102:(10,16),103:(7,4),104:(7,5),105:(7,6),
        106:(7,7),107:(7,8),108:(7,9),109:(7,10),110:(7,11),111:(7,12),112:(7,13),113:(7,14),114:(7,15),115:(7,16),
        116:(7,17),117:(7,18),118:(7,  19)  # note: 19 column used to maintain display, will be clipped
    })
    # Limit groups to 18 for display, adjust 118 placement
    coords_pre[118] = (7,18)

    # Build grid placeholders: we'll create a 10 row x 18 col grid to include lanth/act rows (9 & 10)
    rows = 10
    cols = 18
    grid = [["" for _ in range(cols)] for __ in range(rows)]
    for Z, sym, name in ELEMENTS:
        coord = coords_pre.get(Z, None)
        if coord is None:
            continue
        r, g = coord
        if r > rows: continue
        if g > cols: g = cols
        grid[r-1][g-1] = f"{Z}\n{sym}"

    # Render table using st.markdown with HTML table for nicer layout and clickable links
    # Build HTML
    html = "<table style='border-collapse: collapse;'>"
    for r in range(rows):
        html += "<tr>"
        for c in range(cols):
            cell = grid[r][c]
            if cell:
                Z = int(cell.splitlines()[0])
                sym = cell.splitlines()[1]
                # highlight selected element
                selected = (Z == selected_Z)
                bg = "#4B8BBE" if selected else "#1f2430"
                html += f"<td style='width:54px;height:54px;border:1px solid #333;padding:4px;text-align:center;background:{bg};color:white;'>"
                # make button-like link that triggers selection via query param hack (use streamlit components?) Simpler: instruct user to select by search above.
                html += f"<div style='font-size:12px'>{Z}</div><div style='font-weight:bold'>{sym}</div>"
                html += "</td>"
            else:
                html += "<td style='width:54px;height:54px;border:1px solid #222;background:#0e1117'></td>"
        html += "</tr>"
    html += "</table>"
    st.markdown(html, unsafe_allow_html=True)
    st.caption("Клик: используйте выбор слева или поиск. (Эта сетка — визуальная справка.)")

render_periodic_grid()

# End of app
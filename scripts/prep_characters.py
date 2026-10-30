"""Prepara stills de Downloads/personagens → web/public/characters"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\mteodoro\Downloads\personagens")
DST = Path(r"C:\Users\mteodoro\movidle\web\public\characters")


def save_rgb(im: Image.Image, path: Path) -> None:
    if im.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", im.size, (10, 6, 12))
        if im.mode == "P":
            im = im.convert("RGBA")
        if im.mode in ("RGBA", "LA"):
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
    elif im.mode != "RGB":
        im = im.convert("RGB")

    w, h = im.size
    if max(w, h) < 700:
        scale = 700 / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "JPEG", quality=92, optimize=True)
    print(f"wrote {path.name} {im.size}")


def open_src(name: str) -> Image.Image:
    return Image.open(SRC / name)


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)

    # —— lote 1 (já existente; reprocessa se a fonte estiver aí) ——
    if (SRC / "9-10-11.webp").exists():
        oz = open_src("9-10-11.webp")
        w, h = oz.size
        save_rgb(oz.crop((0, 0, int(w * 0.30), h)), DST / "espantalho.jpg")
        save_rgb(oz.crop((int(w * 0.24), 0, int(w * 0.52), h)), DST / "homem-de-lata.jpg")
        save_rgb(oz.crop((int(w * 0.68), 0, w, h)), DST / "homem-leao.jpg")

    if (SRC / "18.jpg").exists():
        vh = open_src("18.jpg")
        vw, vh_h = vh.size
        save_rgb(vh.crop((0, 0, int(vw * 0.48), vh_h)), DST / "van-helsing.jpg")

    if (SRC / "5.jpg").exists():
        g = open_src("5.jpg")
        gw, gh = g.size
        save_rgb(g.crop((int(gw * 0.38), 0, gw, gh)), DST / "golem.jpg")

    if (SRC / "7.webp").exists():
        ph = open_src("7.webp")
        pw, phh = ph.size
        save_rgb(ph.crop((0, 0, int(pw * 0.58), phh)), DST / "erik.jpg")

    if (SRC / "6.jpg").exists():
        m = open_src("6.jpg")
        mw, mh = m.size
        save_rgb(m.crop((int(mw * 0.28), 0, int(mw * 0.72), mh)), DST / "mephisto.jpg")

    copies_v1 = {
        "1.png": "odeo.jpg",
        "2.webp": "conde-orlok.jpg",
        "3.webp": "maria.jpg",
        "4.jpg": "gwynplaine.jpg",
        "8.webp": "dorothy.jpg",
        "12.webp": "charlie-chaplin.jpg",
        "13.jpg": "branca-de-neve.jpg",
        "14.png": "rainha-ma.jpg",
        "15.jpg": "monstro-de-frankenstein.jpg",
        "16.jpg": "noiva-de-frankenstein.jpg",
        "17.jpg": "conde-dracula.jpg",
        "19.jpg": "dr-jack-griffin.jpg",
        "20.webp": "kong.jpg",
    }
    for src_name, out_name in copies_v1.items():
        if (SRC / src_name).exists():
            save_rgb(open_src(src_name), DST / out_name)

    # —— lote 2 (21–45) ——
    # 21 Jekyll · 22 Hyde · 23 Robin · 24 Kane
    for src_name, out_name in {
        "21.png": "dr-jekyll.jpg",
        "22.jpg": "mr-hyde.jpg",
        "23.jpg": "robin-hood.jpg",
        "24.jpg": "charles-foster-kane.jpg",
    }.items():
        save_rgb(open_src(src_name), DST / out_name)

    # 25 Bambi (+ Thumper) → foca no Bambi
    b = open_src("25.jpg")
    bw, bh = b.size
    save_rgb(b.crop((0, 0, int(bw * 0.58), bh)), DST / "bambi.jpg")

    # 26–27 Pinóquio / Grilo
    save_rgb(open_src("26.jpg"), DST / "pinoquio.jpg")
    save_rgb(open_src("27.jpg"), DST / "grilo-falante.jpg")

    # 28 Geppetto (+ Pinóquio) → foca no Geppetto
    gp = open_src("28.jpg")
    gw, gh = gp.size
    save_rgb(gp.crop((int(gw * 0.18), 0, int(gw * 0.72), gh)), DST / "geppetto.jpg")

    save_rgb(open_src("29.jpg"), DST / "mickey-mouse.jpg")
    save_rgb(open_src("30.jpg"), DST / "dumbo.jpg")
    save_rgb(open_src("31.jpg"), DST / "larry-talbot.jpg")
    save_rgb(open_src("32.webp"), DST / "l-b-jefferies.jpg")
    save_rgb(open_src("33.jpg"), DST / "kikuchiyo.jpg")

    # 34 = A Morte (Sétimo Selo). Antonius Block fica sem still até ter foto dedicada.
    d = open_src("34.jpg")
    dw, dh = d.size
    save_rgb(d.crop((int(dw * 0.42), 0, int(dw * 0.78), dh)), DST / "a-morte.jpg")

    # 35 Tajomaru (+ mulher) → foca nele
    t = open_src("35.jpg")
    tw, th = t.size
    save_rgb(t.crop((0, 0, int(tw * 0.62), th)), DST / "tajomaru.jpg")

    save_rgb(open_src("36.webp"), DST / "harry-powell.jpg")
    save_rgb(open_src("37.jpg"), DST / "cinderela.jpg")

    # 38 Fada (+ pedaço da Cinderela)
    fg = open_src("38.jpg")
    fw, fh = fg.size
    save_rgb(fg.crop((int(fw * 0.22), 0, fw, fh)), DST / "fada-madrinha.jpg")

    save_rgb(open_src("39.webp"), DST / "princesa-aurora.jpg")

    # 40 Peter + Hook → dois recortes
    duel = open_src("40.webp")
    uw, uh = duel.size
    save_rgb(duel.crop((0, 0, int(uw * 0.48), uh)), DST / "peter-pan.jpg")
    save_rgb(duel.crop((int(uw * 0.42), 0, uw, uh)), DST / "capitao-gancho.jpg")

    save_rgb(open_src("42.jpg"), DST / "alice.jpg")
    save_rgb(open_src("43.png"), DST / "chapeleiro-maluco.jpg")

    # 44 Rainha de Copas (Alice ajoelhada na frente)
    q = open_src("44.jpg")
    qw, qh = q.size
    save_rgb(q.crop((int(qw * 0.28), 0, int(qw * 0.78), int(qh * 0.92))), DST / "rainha-de-copas.jpg")

    save_rgb(open_src("45.jpg"), DST / "godzilla.jpg")

    print("total", len(list(DST.glob("*.jpg"))))


if __name__ == "__main__":
    main()

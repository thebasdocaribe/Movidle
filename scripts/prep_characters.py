"""Prepara stills de C:/Users/.../Downloads/personagens → web/public/characters"""
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


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)

    oz = Image.open(SRC / "9-10-11.webp")
    w, h = oz.size
    # Scarecrow | Tin Man | Dorothy | Lion — Dorothy já tem solo em 8.webp
    save_rgb(oz.crop((0, 0, int(w * 0.30), h)), DST / "espantalho.jpg")
    save_rgb(oz.crop((int(w * 0.24), 0, int(w * 0.52), h)), DST / "homem-de-lata.jpg")
    save_rgb(oz.crop((int(w * 0.68), 0, w, h)), DST / "homem-leao.jpg")

    vh = Image.open(SRC / "18.jpg")
    vw, vh_h = vh.size
    save_rgb(vh.crop((0, 0, int(vw * 0.48), vh_h)), DST / "van-helsing.jpg")

    g = Image.open(SRC / "5.jpg")
    gw, gh = g.size
    save_rgb(g.crop((int(gw * 0.38), 0, gw, gh)), DST / "golem.jpg")

    ph = Image.open(SRC / "7.webp")
    pw, phh = ph.size
    save_rgb(ph.crop((0, 0, int(pw * 0.58), phh)), DST / "erik.jpg")

    m = Image.open(SRC / "6.jpg")
    mw, mh = m.size
    save_rgb(m.crop((int(mw * 0.28), 0, int(mw * 0.72), mh)), DST / "mephisto.jpg")

    copies = {
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
    for src_name, out_name in copies.items():
        save_rgb(Image.open(SRC / src_name), DST / out_name)

    print("total", len(list(DST.glob("*.jpg"))))


if __name__ == "__main__":
    main()

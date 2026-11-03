"""Lote 153–184 → web/public/characters"""
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
    longest = max(w, h)
    if longest > 1600:
        scale = 1600 / longest
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    elif longest < 700:
        scale = 700 / longest
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "JPEG", quality=90, optimize=True)
    print(f"wrote {path.name} {im.size}")


def find_src(num: int) -> Path:
    for ext in (".jpg", ".jpeg", ".jfif", ".png", ".webp", ".avif"):
        p = SRC / f"{num}{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"missing {num}")


def copy_num(num: int, out_name: str) -> None:
    save_rgb(Image.open(find_src(num)), DST / out_name)


def pad_bust_to_portrait(im: Image.Image) -> Image.Image:
    """Herbert West: só busto → canvas 3:4 com espaço embaixo pro crop progressivo."""
    if im.mode != "RGB":
        tmp = Image.new("RGB", im.size, (10, 6, 12))
        if im.mode in ("RGBA", "LA"):
            if im.mode == "P":
                im = im.convert("RGBA")
            tmp.paste(im, mask=im.split()[-1] if im.mode in ("RGBA", "LA") else None)
            im = tmp
        else:
            im = im.convert("RGB")

    w, h = im.size
    target_h = max(h, int(w * 4 / 3))
    target_w = max(w, int(target_h * 3 / 4))
    # um pouco mais alto que largo pra caber o busto no terço superior
    target_h = int(target_w * 1.45)
    canvas = Image.new("RGB", (target_w, target_h), (14, 8, 16))
    x0 = (target_w - w) // 2
    y0 = int(target_h * 0.06)
    canvas.paste(im, (x0, y0))
    return canvas


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)

    singles = {
        153: "chucky.jpg",
        154: "david-kessler.jpg",
        155: "snake-plissken.jpg",
        156: "jason-voorhees.jpg",
        157: "pamela-voorhees.jpg",
        # 158 herbert — especial
        159: "humungus.jpg",
        160: "rambo.jpg",
        161: "tyler-durden.jpg",
        162: "truman.jpg",
        163: "forrest-gump.jpg",
        164: "clarice-starling.jpg",
        165: "hannibal-lecter.jpg",
        166: "neo.jpg",
        167: "morpheus.jpg",
        168: "trinity.jpg",
        169: "agente-smith.jpg",
        170: "jack-dawson.jpg",
        171: "rose.jpg",
        172: "sidney-prescott.jpg",
        173: "ghostface.jpg",
        174: "billy-loomis.jpg",
        175: "kevin-mccallister.jpg",
        176: "woody.jpg",
        177: "buzz-lightyear.jpg",
        178: "rex.jpg",
        179: "senhor-cabeca-de-batata.jpg",
        180: "jessie.jpg",
        181: "slinky.jpg",
        182: "grant.jpg",
        183: "mima.jpg",
        184: "jack-skellington.jpg",
    }

    for n, out in singles.items():
        copy_num(n, out)

    west = Image.open(find_src(158))
    save_rgb(pad_bust_to_portrait(west), DST / "herbert-west.jpg")

    print("total jpg", len(list(DST.glob("*.jpg"))))


if __name__ == "__main__":
    main()

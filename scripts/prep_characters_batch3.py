"""Lote 46–152: Downloads/personagens → web/public/characters"""
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
    # Evita JPG gigante (ex.: 53.jpg)
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
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = SRC / f"{num}{ext}"
        if p.exists():
            return p
    raise FileNotFoundError(f"missing source {num}")


def copy_num(num: int, out_name: str) -> None:
    save_rgb(Image.open(find_src(num)), DST / out_name)


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)

    # 46–71 singles
    singles_a = {
        46: "ethan-edwards.jpg",
        47: "judah-ben-hur.jpg",
        48: "don-lockwood.jpg",
        49: "norman-bates.jpg",
        50: "blondie.jpg",
        51: "tuco.jpg",
        52: "angel-eyes.jpg",
        53: "rosemary.jpg",
        54: "hanshiro-tsugumo.jpg",
        55: "guido-anselmi.jpg",
        56: "ben.jpg",
        57: "mary-poppins.jpg",
        58: "cruela-de-vil.jpg",
        59: "pongo.jpg",
        60: "george-taylor.jpg",
        61: "cornelius.jpg",
        62: "woman.jpg",
        63: "james-bond.jpg",
        64: "don-vito-corleone.jpg",
        65: "michael-corleone.jpg",
        66: "travis-bickle.jpg",
        67: "luke-skywalker.jpg",
        68: "han-solo.jpg",
        69: "princesa-leia.jpg",
        70: "grand-moff-tarkin.jpg",
        71: "obi-wan-kenobi.jpg",
    }
    for n, out in singles_a.items():
        copy_num(n, out)

    # 72–73 C-3PO | R2-D2
    duo = Image.open(SRC / "72-73.webp")
    w, h = duo.size
    save_rgb(duo.crop((0, 0, int(w * 0.55), h)), DST / "c-3po.jpg")
    save_rgb(duo.crop((int(w * 0.40), 0, w, h)), DST / "r2-d2.jpg")

    singles_b = {
        74: "chewbacca.jpg",
        75: "darth-vader.jpg",
        76: "alien.jpg",
        77: "ellen-ripley.jpg",
        # 78 Jaws — crop puxa barbatana pra baixo (estágio Pernas)
        79: "brody.jpg",
        80: "alex-delarge.jpg",
        81: "frank-n-furter.jpg",
        82: "laurie-strode.jpg",
        83: "michael-myers.jpg",
        84: "carrie-white.jpg",
        85: "leatherface.jpg",
        86: "chris-macneil.jpg",
        87: "regan-macneil.jpg",
        88: "father-karras.jpg",
        89: "father-merrin.jpg",
    }
    for n, out in singles_b.items():
        copy_num(n, out)

    jaws = Image.open(find_src(78))
    jw, jh = jaws.size
    # Foca cabeça+barbatana; deixa barbatana na faixa inferior do quadro
    save_rgb(
        jaws.crop((int(jw * 0.15), int(jh * 0.05), int(jw * 0.85), int(jh * 0.72))),
        DST / "tubarao.jpg",
    )

    # 90–91 Sandy | Danny
    grease = Image.open(SRC / "90-91.jpg")
    gw, gh = grease.size
    save_rgb(grease.crop((0, 0, int(gw * 0.52), gh)), DST / "sandy.jpg")
    save_rgb(grease.crop((int(gw * 0.40), 0, gw, gh)), DST / "danny-zuko.jpg")

    singles_c = {
        92: "rocky-balboa.jpg",
        93: "apollo-creed.jpg",
        94: "henry-spencer.jpg",
        95: "suzy-bannion.jpg",
        96: "rei-arthur.jpg",
        97: "cavaleiro-negro.jpg",
        98: "willy-wonka.jpg",
        99: "winslow-leach.jpg",
        100: "divine.jpg",
        101: "superman.jpg",
        102: "lex-luthor.jpg",
        103: "lois-lane.jpg",
        104: "jor-el.jpg",
        105: "max-rockatansky.jpg",
        106: "jack-torrance.jpg",
        107: "marty-mcfly.jpg",
        108: "emmett-brown.jpg",
        109: "totoro.jpg",
        110: "yoda.jpg",
        111: "boba-fett.jpg",
        112: "tony-montana.jpg",
        113: "macready.jpg",
        114: "deckard.jpg",
        115: "roy-batty.jpg",
        116: "anakin-skywalker.jpg",
        117: "emperor-palpatine.jpg",
        118: "beetlejuice.jpg",
        119: "john-mcclane.jpg",
        120: "indiana-jones.jpg",
        121: "e-t.jpg",
        122: "sargento-hartman.jpg",
        123: "kaneda.jpg",
        124: "tetsuo.jpg",
        125: "maverick.jpg",
        126: "exterminador.jpg",
        127: "kyle-reese.jpg",
        128: "sarah-connor.jpg",
        129: "nancy-thompson.jpg",
        130: "freddy-krueger.jpg",
        131: "peter-venkman.jpg",
        132: "john-merrick.jpg",
        133: "ash-williams.jpg",
        134: "seth-brundle.jpg",
        135: "ariel.jpg",
        136: "ursula.jpg",
        137: "sebastian.jpg",
        138: "batman.jpg",
        139: "joker.jpg",
        140: "dutch-schaefer.jpg",
        141: "predador.jpg",
        142: "pinhead.jpg",
        143: "larry.jpg",
        144: "julia.jpg",
        145: "kirsty-cotton.jpg",
        146: "butterball.jpg",
        147: "chatterer.jpg",
        148: "female-cenobite.jpg",
        149: "roger-rabbit.jpg",
        150: "robocop.jpg",
        151: "stripe.jpg",
        152: "gizmo.jpg",
    }
    for n, out in singles_c.items():
        copy_num(n, out)

    print("total jpg", len(list(DST.glob("*.jpg"))))


if __name__ == "__main__":
    main()

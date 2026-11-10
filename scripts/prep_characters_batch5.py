"""Lote 185–312 → web/public/characters.

Duals: 196-197 Gomez/Morticia · 276-277 Shrek/Burro
273 = Mary Jane (cena com Peter; Peter é 272)
271 = Voldemort (extra na pasta; entra no catálogo)
312 = Davy Jones (Juno permanece pending)
"""
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


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)

    singles = {
        185: "mulan.jpg",
        186: "stanley-ipkiss.jpg",
        187: "mushu.jpg",
        188: "kay.jpg",
        189: "jay.jpg",
        190: "darth-maul.jpg",
        191: "hercules.jpg",
        192: "matilda.jpg",
        193: "bela.jpg",
        194: "fera.jpg",
        195: "flik.jpg",
        198: "wednesday.jpg",
        199: "penguin.jpg",
        200: "catwoman.jpg",
        201: "blade.jpg",
        202: "kermit.jpg",
        203: "tarzan.jpg",
        204: "jane.jpg",
        205: "kala.jpg",
        206: "candyman.jpg",
        207: "charada.jpg",
        208: "duas-caras.jpg",
        209: "pernalonga.jpg",
        210: "patolino.jpg",
        211: "ace-ventura.jpg",
        212: "pennywise.jpg",
        213: "samara.jpg",
        214: "dr-frio.jpg",
        215: "stuart-little.jpg",
        216: "gasparzinho.jpg",
        217: "cartman.jpg",
        218: "stan.jpg",
        219: "kenny.jpg",
        220: "kyle.jpg",
        221: "howard-langston.jpg",
        222: "tiffany.jpg",
        223: "lionel.jpg",
        224: "z.jpg",
        225: "zorro.jpg",
        226: "mufasa.jpg",
        227: "simba.jpg",
        228: "timao.jpg",
        229: "pumba.jpg",
        230: "liu-kang.jpg",
        231: "raiden.jpg",
        232: "sub-zero.jpg",
        233: "scorpion.jpg",
        234: "darkman.jpg",
        235: "sherman-klump.jpg",
        236: "wallace.jpg",
        237: "gromit.jpg",
        238: "leprechaun.jpg",
        239: "spawn.jpg",
        240: "juiz-dredd.jpg",
        241: "leonardo.jpg",
        242: "raphael.jpg",
        243: "donatello.jpg",
        244: "michelangelo.jpg",
        245: "djinn.jpg",
        246: "aladin.jpg",
        247: "genio.jpg",
        248: "chihiro.jpg",
        249: "haku.jpg",
        250: "frank.jpg",
        251: "donnie-darko.jpg",
        252: "wall-e.jpg",
        253: "eva.jpg",
        254: "remy.jpg",
        255: "linguini.jpg",
        256: "coraline.jpg",
        257: "outra-mae.jpg",
        258: "frodo.jpg",
        259: "sam.jpg",
        260: "gandalf.jpg",
        261: "aragorn.jpg",
        262: "saruman.jpg",
        263: "legolas.jpg",
        264: "gimli.jpg",
        265: "sauron.jpg",
        266: "harry-potter.jpg",
        267: "ron-weasley.jpg",
        268: "hermione.jpg",
        269: "dumbledore.jpg",
        270: "sirius-black.jpg",
        271: "voldemort.jpg",
        272: "peter-parker.jpg",
        # 273 → mary-jane (crop)
        274: "harry-osborn.jpg",
        275: "doc-otto.jpg",
        # 276-277 dual · 278 gato · 279 fiona
        278: "gato-de-botas.jpg",
        279: "fiona.jpg",
        280: "relampago-mcqueen.jpg",
        281: "sullivan.jpg",
        282: "mike-wazowski.jpg",
        283: "buscape.jpg",
        284: "ze-pequeno.jpg",
        285: "bene.jpg",
        286: "patrick-bateman.jpg",
        287: "jake-sully.jpg",
        288: "bella-swan.jpg",
        289: "edward-cullen.jpg",
        290: "anton-chigurh.jpg",
        291: "tony-stark.jpg",
        292: "oh-dae-su.jpg",
        293: "maximus.jpg",
        294: "commodus.jpg",
        295: "beto-pera.jpg",
        296: "violeta.jpg",
        297: "helena-pera.jpg",
        298: "flecha.jpg",
        299: "zeze.jpg",
        300: "sindrome.jpg",
        301: "carl-fredricksen.jpg",
        302: "russell.jpg",
        303: "sara-goldfarb.jpg",
        304: "seth.jpg",
        305: "evan.jpg",
        306: "fogell.jpg",
        307: "amelie-poulain.jpg",
        308: "victor-van-dort.jpg",
        309: "a-noiva.jpg",
        310: "jack-sparrow.jpg",
        311: "will-turner.jpg",
        312: "davy-jones.jpg",
    }

    for num, out in singles.items():
        copy_num(num, out)

    # 196-197: Morticia esquerda · Gomez direita
    addams = Image.open(SRC / "196-197.webp")
    aw, ah = addams.size
    save_rgb(addams.crop((int(aw * 0.42), 0, aw, ah)), DST / "gomez-addams.jpg")
    save_rgb(addams.crop((0, 0, int(aw * 0.58), ah)), DST / "morticia-addams.jpg")

    # 273: foca Mary Jane (esquerda)
    mj = Image.open(find_src(273))
    mw, mh = mj.size
    save_rgb(mj.crop((0, 0, int(mw * 0.52), mh)), DST / "mary-jane.jpg")

    # 276-277: Burro esquerda · Shrek direita
    duo = Image.open(SRC / "276-277.jpg")
    dw, dh = duo.size
    save_rgb(duo.crop((int(dw * 0.38), 0, dw, dh)), DST / "shrek.jpg")
    save_rgb(duo.crop((0, 0, int(dw * 0.62), dh)), DST / "burro.jpg")

    print("batch5 done", len(list(DST.glob("*.jpg"))), "jpg in public/characters")


if __name__ == "__main__":
    main()

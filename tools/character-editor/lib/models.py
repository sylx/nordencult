"""
Python dataclasses mirroring the TypeScript Character interface.
Keep in sync with src/data/character.ts
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Literal, Optional


@dataclass
class SpriteInfo:
    url: str
    x: int  # column index 0-4
    y: int  # row index 0-2


@dataclass
class FaceRect:
    x: float
    y: float
    width: float
    height: float


@dataclass
class ImageInfo:
    sprite: SpriteInfo
    faceRect: FaceRect


CharacterType = Literal["knight", "scholar", "politician", "magician", "hunter"]
BloodRelationType = Literal["father", "mother", "son", "daughter", "brother", "sister"]


@dataclass
class MercenaryInfo:
    name: str
    fee: int


@dataclass
class BloodRelation:
    relation: BloodRelationType
    characterId: str


@dataclass
class Character:
    id: str
    name: str
    type: CharacterType
    imageInfo: ImageInfo
    politics: int
    intelligence: int
    leadership: int
    charm: int
    mercenaryInfo: Optional[MercenaryInfo] = None
    bloodRelations: Optional[list[BloodRelation]] = field(default=None)
    belongTo: Optional[str] = None
    belongToFaction: Optional[str] = None


def character_to_dict(c: Character) -> dict:
    """Convert Character dataclass to dict (for JSON serialization)."""
    return asdict(c)


def character_from_dict(d: dict) -> Character:
    """Convert a raw dict to a Character dataclass. Unknown keys are ignored."""
    sprite = d.get("imageInfo", {}).get("sprite", {})
    face = d.get("imageInfo", {}).get("faceRect", {})
    image_info = ImageInfo(
        sprite=SpriteInfo(
            url=sprite.get("url", ""),
            x=sprite.get("x", 0),
            y=sprite.get("y", 0),
        ),
        faceRect=FaceRect(
            x=face.get("x", 0),
            y=face.get("y", 0),
            width=face.get("width", 0),
            height=face.get("height", 0),
        ),
    )
    mercenary = None
    if d.get("mercenaryInfo"):
        m = d["mercenaryInfo"]
        mercenary = MercenaryInfo(name=m.get("name", ""), fee=m.get("fee", 0))

    blood = None
    if d.get("bloodRelations"):
        blood = [
            BloodRelation(relation=b.get("relation", "father"), characterId=b.get("characterId", ""))
            for b in d["bloodRelations"]
        ]

    return Character(
        id=d.get("id", ""),
        name=d.get("name", ""),
        type=d.get("type", "knight"),
        imageInfo=image_info,
        politics=d.get("politics", 50),
        intelligence=d.get("intelligence", 50),
        leadership=d.get("leadership", 50),
        charm=d.get("charm", 50),
        mercenaryInfo=mercenary,
        bloodRelations=blood,
        belongTo=d.get("belongTo"),
        belongToFaction=d.get("belongToFaction"),
    )

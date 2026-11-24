from .saas import SPEC as SAAS

TEMPLATES = {"saas": SAAS}

TEMPLATE_CHOICES = [
    {"key": key, "name": spec["name"], "tagline": spec["tagline"], "industry": spec["industry"]}
    for key, spec in TEMPLATES.items()
]

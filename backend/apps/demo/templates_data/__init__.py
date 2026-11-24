from .ecommerce import SPEC as ECOMMERCE
from .helpdesk import SPEC as HELPDESK
from .saas import SPEC as SAAS

TEMPLATES = {"saas": SAAS, "helpdesk": HELPDESK, "ecommerce": ECOMMERCE}

TEMPLATE_CHOICES = [
    {"key": key, "name": spec["name"], "tagline": spec["tagline"], "industry": spec["industry"]}
    for key, spec in TEMPLATES.items()
]

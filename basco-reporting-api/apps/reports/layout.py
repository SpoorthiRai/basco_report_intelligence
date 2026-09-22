"""Layout-category classifiers shared by Overview and Brand & Visual Adoption."""


def is_intel_layout_only(layout_str) -> bool:
    """True for 'Intel Layouts' (standard Intel layouts, not custom)."""
    if not layout_str:
        return False
    text = str(layout_str).lower().strip()
    return ("intel" in text and "layout" in text) and ("custom" not in text)


def is_custom_intel_layout(layout_str) -> bool:
    """True for 'Custom-Intel Layouts'."""
    if not layout_str:
        return False
    text = str(layout_str).lower().strip()
    return "custom" in text and "intel" in text


def is_retailer_layout(layout_str) -> bool:
    """True for 'Retailers Layouts'."""
    if not layout_str:
        return False
    compact = str(layout_str).lower().replace(" ", "").replace("-", "").replace("_", "")
    return "retailer" in compact


def is_cobranded_layout(layout_str) -> bool:
    """True for 'Co-Branded Layouts'."""
    if not layout_str:
        return False
    compact = str(layout_str).lower().replace(" ", "").replace("-", "").replace("_", "")
    return "cobrand" in compact


def is_intel_or_custom_layout(layout_str) -> bool:
    """Intel Layouts or Custom-Intel Layouts (layout only, no visual flag)."""
    return is_intel_layout_only(layout_str) or is_custom_intel_layout(layout_str)


def is_any_intel_layout(layout_str, intel_flag=None) -> bool:
    """Intel Layouts, Custom-Intel Layouts, or Intel_Visual_Flag = Yes."""
    flag_yes = str(intel_flag).lower().strip() == "yes" if intel_flag else False
    return is_intel_layout_only(layout_str) or is_custom_intel_layout(layout_str) or flag_yes

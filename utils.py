"""
Core Utilities for Maroa PMS
PT. MAROA TUNGGA ABADI
"""

def int_to_roman(num: int) -> str:
    """Convert integer month (1-12) to Roman numerals."""
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syb = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syb[i]
            num -= val[i]
        i += 1
    return roman_num

def format_rupiah(amount) -> str:
    """Format decimal/float number to Indonesian Rupiah currency string."""
    try:
        val = float(amount or 0)
        # Formatted with dot thousand separator and comma decimal
        formatted = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"Rp {formatted}"
    except (ValueError, TypeError):
        return "Rp 0,00"

def get_client_ip(request) -> str:
    """Extract client IP address from Django request."""
    if not request:
        return '127.0.0.1'
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip

def get_logo_base64() -> str:
    """Returns base64 data URI of the official MAROA logo."""
    import os, base64
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img', 'maroa_logo.png')
    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            encoded = base64.b64encode(f.read()).decode('utf-8')
            return f"data:image/png;base64,{encoded}"
    return ""

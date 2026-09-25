import io
from django.template.loader import render_to_string
from django.http import HttpResponse
from core.utils import format_rupiah, get_logo_base64
from audit_logs.utils import log_system_action

def render_quotation_pdf(quotation, request=None):
    """
    Renders Quotation PDF using WeasyPrint (or robust xhtml2pdf fallback).
    """
    tax_percent_label = "11%" if quotation.tax_rate > 0 else "0%"
    context = {
        'quotation': quotation,
        'tax_percent_label': tax_percent_label,
        'formatted_subtotal': format_rupiah(quotation.subtotal),
        'formatted_tax_amount': format_rupiah(quotation.tax_amount),
        'formatted_grand_total': format_rupiah(quotation.grand_total),
        'logo_base64': get_logo_base64(),
    }

    html_string = render_to_string('pdf/quotation_pdf.html', context)

    # 1. Try WeasyPrint if available
    try:
        from weasyprint import HTML
        pdf_file = HTML(string=html_string).write_pdf()
        
        # Log PDF export
        log_system_action(
            action='EXPORT_PDF',
            module='QUOTATIONS',
            object_id=quotation.id,
            object_repr=f"Quotation PDF: {quotation.quotation_number}",
            request=request
        )

        response = HttpResponse(pdf_file, content_type='application/pdf')
        filename = f"Quotation_{quotation.quotation_number.replace('/', '_')}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
    except Exception as weasy_err:
        pass

    # 2. Fallback to xhtml2pdf
    try:
        from xhtml2pdf import pisa
        result_io = io.BytesIO()
        pdf = pisa.pisaDocument(io.BytesIO(html_string.encode("UTF-8")), result_io)
        if not pdf.err:
            log_system_action(
                action='EXPORT_PDF',
                module='QUOTATIONS',
                object_id=quotation.id,
                object_repr=f"Quotation PDF: {quotation.quotation_number}",
                request=request
            )
            response = HttpResponse(result_io.getvalue(), content_type='application/pdf')
            filename = f"Quotation_{quotation.quotation_number.replace('/', '_')}.pdf"
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
    except Exception as xhtml_err:
        pass

    # 3. Fallback to direct HTML print preview
    response = HttpResponse(html_string, content_type='text/html')
    return response

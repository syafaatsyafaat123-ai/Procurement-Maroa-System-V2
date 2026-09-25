from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from decimal import Decimal
from datetime import datetime, timedelta
from quotations.models import Quotation
from purchase_orders.models import PurchaseOrder
from bast.models import BAST
from products.models import Product
from companies.models import Company
from audit_logs.models import AuditLog
from core.utils import format_rupiah

class DashboardStatsView(APIView):
    """
    Returns aggregated business KPI metrics, charts data, and activity feeds.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Total Metrics
        total_quotations = Quotation.objects.count()
        approved_quotations = Quotation.objects.filter(status__in=['APPROVED', 'CONVERTED']).count()
        conversion_rate = round((approved_quotations / total_quotations * 100), 1) if total_quotations > 0 else 0

        total_quotation_value = Quotation.objects.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
        total_po_value = PurchaseOrder.objects.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')

        total_pos = PurchaseOrder.objects.count()
        active_pos = PurchaseOrder.objects.filter(status__in=['ISSUED', 'PARTIAL']).count()
        completed_basts = BAST.objects.filter(status__in=['SIGNED', 'COMPLETED']).count()

        total_products = Product.objects.filter(is_active=True).count()
        total_customers = Company.objects.filter(company_type__in=['CUSTOMER', 'BOTH']).count()
        total_suppliers = Company.objects.filter(company_type__in=['SUPPLIER', 'BOTH']).count()

        # 2. Quotation Status Breakdown
        status_counts = Quotation.objects.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}

        # 3. Monthly Trend (Past 6 Months)
        today = datetime.now()
        months_labels = []
        monthly_quotation_values = []
        monthly_po_values = []

        for i in range(5, -1, -1):
            m_date = today - timedelta(days=i*30)
            month_year = m_date.strftime('%b %Y')
            months_labels.append(month_year)

            q_val = Quotation.objects.filter(
                date__year=m_date.year,
                date__month=m_date.month
            ).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
            monthly_quotation_values.append(float(q_val))

            p_val = PurchaseOrder.objects.filter(
                po_date__year=m_date.year,
                po_date__month=m_date.month
            ).aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
            monthly_po_values.append(float(p_val))

        # 4. Recent Quotations Feed
        recent_quotations = Quotation.objects.select_related('customer').order_by('-id')[:5]
        recent_quotations_data = [{
            'id': q.id,
            'number': q.quotation_number,
            'customer': q.customer_name_text or (q.customer.company_name if q.customer else 'PT SINAR TERANG MANDIRI'),
            'date': q.date.strftime('%d/%m/%Y'),
            'total': format_rupiah(q.grand_total),
            'status': q.status,
            'status_display': q.get_status_display()
        } for q in recent_quotations]

        # 5. Recent Purchase Orders Feed
        recent_pos = PurchaseOrder.objects.select_related('supplier').order_by('-id')[:5]
        recent_pos_data = [{
            'id': p.id,
            'number': p.po_number,
            'supplier': p.supplier.company_name if p.supplier else 'Vendor Rekanan',
            'date': p.po_date.strftime('%d/%m/%Y'),
            'total': format_rupiah(p.grand_total),
            'status': p.status,
            'status_display': p.get_status_display()
        } for p in recent_pos]

        # 6. Recent Audit Activity
        recent_audits = AuditLog.objects.order_by('-id')[:8]
        recent_audits_data = [{
            'id': a.id,
            'user': a.user_name,
            'action': a.action,
            'module': a.module,
            'object_repr': a.object_repr,
            'time': a.timestamp.strftime('%d %b, %H:%M')
        } for a in recent_audits]

        return Response({
            'kpis': {
                'total_quotations': total_quotations,
                'total_quotations_value': format_rupiah(total_quotation_value),
                'total_po_value': format_rupiah(total_po_value),
                'conversion_rate': f"{conversion_rate}%",
                'active_pos': active_pos,
                'total_pos': total_pos,
                'completed_basts': completed_basts,
                'total_products': total_products,
                'total_customers': total_customers,
                'total_suppliers': total_suppliers,
            },
            'status_distribution': {
                'DRAFT': status_dict.get('DRAFT', 0),
                'SENT': status_dict.get('SENT', 0),
                'APPROVED': status_dict.get('APPROVED', 0),
                'CONVERTED': status_dict.get('CONVERTED', 0),
                'REJECTED': status_dict.get('REJECTED', 0),
                'CANCELLED': status_dict.get('CANCELLED', 0),
            },
            'charts': {
                'labels': months_labels,
                'quotations': monthly_quotation_values,
                'purchase_orders': monthly_po_values,
            },
            'recent_quotations': recent_quotations_data,
            'recent_pos': recent_pos_data,
            'recent_audits': recent_audits_data,
        })

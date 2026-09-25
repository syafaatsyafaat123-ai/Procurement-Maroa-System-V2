from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from quotations.models import Quotation, QuotationItem
from purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from bast.models import BAST, BASTItem
from products.models import Product
from companies.models import Company
from core.utils import format_rupiah

class GlobalSearchView(APIView):
    """
    Unified multi-entity debounced search endpoint.
    Searches Quotation No, PO No, BAST No, Part Number, Description, and Company Name.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'results': []})

        results = []

        # 1. Search Quotations
        qs_list = Quotation.objects.filter(
            Q(quotation_number__icontains=query) |
            Q(customer__company_name__icontains=query) |
            Q(project_reference__icontains=query)
        ).select_related('customer')[:5]

        for q in qs_list:
            results.append({
                'type': 'QUOTATION',
                'badge_color': 'blue',
                'id': q.id,
                'title': q.quotation_number,
                'subtitle': f"Customer: {q.customer.company_name} | {q.date.strftime('%d/%m/%Y')}",
                'amount': format_rupiah(q.grand_total),
                'status': q.status,
                'url_hash': f"#quotations"
            })

        # 2. Search Purchase Orders
        po_list = PurchaseOrder.objects.filter(
            Q(po_number__icontains=query) |
            Q(supplier__company_name__icontains=query)
        ).select_related('supplier')[:5]

        for p in po_list:
            results.append({
                'type': 'PURCHASE_ORDER',
                'badge_color': 'teal',
                'id': p.id,
                'title': p.po_number,
                'subtitle': f"Vendor: {p.supplier.company_name} | {p.po_date.strftime('%d/%m/%Y')}",
                'amount': format_rupiah(p.grand_total),
                'status': p.status,
                'url_hash': f"#purchase-orders"
            })

        # 3. Search BAST
        bast_list = BAST.objects.filter(
            Q(bast_number__icontains=query) |
            Q(customer__company_name__icontains=query) |
            Q(delivery_order_number__icontains=query) |
            Q(project_name__icontains=query)
        ).select_related('customer')[:5]

        for b in bast_list:
            results.append({
                'type': 'BAST',
                'badge_color': 'amber',
                'id': b.id,
                'title': b.bast_number,
                'subtitle': f"Customer: {b.customer.company_name} | {b.bast_date.strftime('%d/%m/%Y')}",
                'amount': f"DO: {b.delivery_order_number or '-'}",
                'status': b.status,
                'url_hash': f"#bast"
            })

        # 4. Search Products & Parts
        prod_list = Product.objects.filter(
            Q(part_number__icontains=query) |
            Q(description__icontains=query) |
            Q(brand__icontains=query)
        )[:5]

        for pr in prod_list:
            results.append({
                'type': 'PRODUCT',
                'badge_color': 'indigo',
                'id': pr.id,
                'title': f"{pr.part_number} - {pr.brand or 'Generic'}",
                'subtitle': pr.description[:70],
                'amount': format_rupiah(pr.price_estimate),
                'status': 'ACTIVE' if pr.is_active else 'INACTIVE',
                'url_hash': f"#products"
            })

        # 5. Search Companies
        comp_list = Company.objects.filter(
            Q(company_name__icontains=query) |
            Q(contact_person__icontains=query) |
            Q(city__icontains=query)
        )[:5]

        for c in comp_list:
            results.append({
                'type': 'COMPANY',
                'badge_color': 'emerald',
                'id': c.id,
                'title': c.company_name,
                'subtitle': f"{c.get_company_type_display()} | {c.city}",
                'amount': c.phone or c.email,
                'status': 'ACTIVE' if c.is_active else 'INACTIVE',
                'url_hash': f"#companies"
            })

        return Response({'results': results})

class LifecycleTimelineView(APIView):
    """
    Visual lifecycle progression tracker:
    Product -> Quotation -> Purchase Order -> BAST
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        part_number = request.query_params.get('part_number', '').strip()
        quotation_id = request.query_params.get('quotation_id')
        po_id = request.query_params.get('po_id')
        bast_id = request.query_params.get('bast_id')

        steps = []

        # Find starting point or trace complete chain
        product_obj = None
        quotation_obj = None
        po_obj = None
        bast_obj = None

        if bast_id:
            try:
                bast_obj = BAST.objects.select_related('purchase_order', 'customer').prefetch_related('items').get(id=bast_id)
                po_obj = bast_obj.purchase_order
                if po_obj and po_obj.quotation:
                    quotation_obj = po_obj.quotation
            except BAST.DoesNotExist:
                pass

        elif po_id:
            try:
                po_obj = PurchaseOrder.objects.select_related('quotation', 'supplier').prefetch_related('items', 'basts').get(id=po_id)
                if po_obj.quotation:
                    quotation_obj = po_obj.quotation
                bast_obj = po_obj.basts.first()
            except PurchaseOrder.DoesNotExist:
                pass

        elif quotation_id:
            try:
                quotation_obj = Quotation.objects.select_related('customer').prefetch_related('items', 'purchase_orders').get(id=quotation_id)
                po_obj = quotation_obj.purchase_orders.first()
                if po_obj:
                    bast_obj = po_obj.basts.first()
            except Quotation.DoesNotExist:
                pass

        elif part_number:
            try:
                product_obj = Product.objects.get(part_number__iexact=part_number)
            except Product.DoesNotExist:
                product_obj = Product.objects.filter(part_number__icontains=part_number).first()

            if product_obj:
                q_item = QuotationItem.objects.filter(product=product_obj).select_related('quotation').first()
                if q_item:
                    quotation_obj = q_item.quotation
                    po_obj = quotation_obj.purchase_orders.first()
                    if po_obj:
                        bast_obj = po_obj.basts.first()

        # Step 1: Product Master Stage
        if product_obj or (quotation_obj and quotation_obj.items.first() and quotation_obj.items.first().product):
            p = product_obj or quotation_obj.items.first().product
            steps.append({
                'stage': 'MASTER_PRODUCT',
                'title': '1. Master Katalog Produk',
                'status': 'COMPLETED',
                'number': p.part_number,
                'date': p.created_at.strftime('%d/%m/%Y'),
                'details': f"Brand: {p.brand or '-'} | UOM: {p.default_uom} | Est: {format_rupiah(p.price_estimate)}",
                'description': p.description
            })
        else:
            steps.append({
                'stage': 'MASTER_PRODUCT',
                'title': '1. Master Katalog Produk',
                'status': 'PENDING' if not quotation_obj else 'COMPLETED',
                'number': quotation_obj.items.first().part_number if quotation_obj and quotation_obj.items.exists() else '-',
                'date': '-',
                'details': 'Item kustom / pengadaan bebas',
                'description': 'Item langsung ditambahkan pada penawaran harga.'
            })

        # Step 2: Quotation Stage
        if quotation_obj:
            steps.append({
                'stage': 'QUOTATION',
                'title': '2. Penawaran Harga (Quotation)',
                'status': 'COMPLETED',
                'number': quotation_obj.quotation_number,
                'date': quotation_obj.date.strftime('%d/%m/%Y'),
                'details': f"Klien: {quotation_obj.customer.company_name} | Total: {format_rupiah(quotation_obj.grand_total)}",
                'description': f"Status: {quotation_obj.get_status_display()} | Ref: {quotation_obj.project_reference or '-'}"
            })
        else:
            steps.append({
                'stage': 'QUOTATION',
                'title': '2. Penawaran Harga (Quotation)',
                'status': 'PENDING',
                'number': '-',
                'date': '-',
                'details': 'Belum dibuat penawaran harga',
                'description': 'Menunggu penerbitan QS resmi.'
            })

        # Step 3: Purchase Order Stage
        if po_obj:
            steps.append({
                'stage': 'PURCHASE_ORDER',
                'title': '3. Purchase Order (PO)',
                'status': 'COMPLETED',
                'number': po_obj.po_number,
                'date': po_obj.po_date.strftime('%d/%m/%Y'),
                'details': f"Vendor: {po_obj.supplier.company_name} | Total: {format_rupiah(po_obj.grand_total)}",
                'description': f"Status: {po_obj.get_status_display()} | Target: {po_obj.expected_delivery_date.strftime('%d/%m/%Y') if po_obj.expected_delivery_date else '-'}"
            })
        else:
            steps.append({
                'stage': 'PURCHASE_ORDER',
                'title': '3. Purchase Order (PO)',
                'status': 'PENDING',
                'number': '-',
                'date': '-',
                'details': 'Belum diterbitkan PO',
                'description': 'Menunggu konversi atau pembuatan PO ke vendor.'
            })

        # Step 4: BAST Stage
        if bast_obj:
            steps.append({
                'stage': 'BAST',
                'title': '4. Berita Acara Serah Terima (BAST)',
                'status': 'COMPLETED',
                'number': bast_obj.bast_number,
                'date': bast_obj.bast_date.strftime('%d/%m/%Y'),
                'details': f"Penerima: {bast_obj.customer.company_name} (d/h {bast_obj.received_by})",
                'description': f"Status: {bast_obj.get_status_display()} | No DO: {bast_obj.delivery_order_number or '-'}"
            })
        else:
            steps.append({
                'stage': 'BAST',
                'title': '4. Berita Acara Serah Terima (BAST)',
                'status': 'PENDING',
                'number': '-',
                'date': '-',
                'details': 'Belum dilakukan serah terima fisik',
                'description': 'Menunggu pengiriman dan verifikasi kondisi barang di lokasi.'
            })

        return Response({
            'part_number': part_number,
            'steps': steps
        })

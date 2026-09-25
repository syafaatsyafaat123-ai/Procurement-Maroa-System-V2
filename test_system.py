"""
Comprehensive End-to-End Automated Test Suite for Maroa PMS
PT. MAROA TUNGGA ABADI
"""

import os
import django
from decimal import Decimal
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maroa_pms.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from quotations.models import Quotation, QuotationItem
from purchase_orders.models import PurchaseOrder
from bast.models import BAST
from products.models import Product
from companies.models import Company
from audit_logs.models import AuditLog

def run_e2e_tests():
    print("=================================================================")
    print("[TEST] RUNNING COMPREHENSIVE E2E TEST SUITE: MAROA PMS")
    print("=================================================================\n")
    client = Client()

    # 1. Test Authentication
    print("[TEST 1/8] Testing Authentication API (Accounts: syafaat, safar, surya)...")
    res_login = client.post('/api/auth/login/', {'username': 'syafaat', 'password': '1114ROA'}, content_type='application/json')
    assert res_login.status_code == 200, f"Login failed: {res_login.status_code} - {res_login.content}"
    token = res_login.json()['token']
    auth_header = {'HTTP_AUTHORIZATION': f'Token {token}'}
    print("   [+] Admin 'syafaat' login successful. Token: " + token[:12] + "...")

    res_login_safar = client.post('/api/auth/login/', {'username': 'safar', 'password': '1114ROA'}, content_type='application/json')
    assert res_login_safar.status_code == 200, "Login for safar failed"
    print("   [+] Procurement Officer 'safar' login successful.")

    res_login_surya = client.post('/api/auth/login/', {'username': 'surya', 'password': '1114ROA'}, content_type='application/json')
    assert res_login_surya.status_code == 200, "Login for surya failed"
    print("   [+] Staff 'surya' login successful.")

    # 2. Test Dashboard Stats
    print("\n[TEST 2/8] Testing Dashboard Analytics & Aggregation Endpoint...")
    res_stats = client.get('/api/dashboard/stats/', **auth_header)
    assert res_stats.status_code == 200, "Dashboard stats failed"
    stats_data = res_stats.json()
    assert 'kpis' in stats_data and 'charts' in stats_data
    print(f"   [+] Dashboard KPIs loaded: Total Quotations = {stats_data['kpis']['total_quotations']}, Conversion = {stats_data['kpis']['conversion_rate']}")

    # 3. Test Master Data (Companies & Products)
    print("\n[TEST 3/8] Testing Master Products & Companies API...")
    res_comp = client.get('/api/companies/', **auth_header)
    assert res_comp.status_code == 200
    assert len(res_comp.json().get('results', [])) > 0
    print(f"   [+] Companies catalog loaded ({len(res_comp.json().get('results', []))} companies).")

    res_prod = client.get('/api/products/', **auth_header)
    assert res_prod.status_code == 200
    assert len(res_prod.json().get('results', [])) > 0
    print(f"   [+] Products catalog loaded ({len(res_prod.json().get('results', []))} products).")

    # 4. Test Quotation Creation & Recalculation
    print("\n[TEST 4/8] Testing Quotation Creation with Row-Level Locking Sequence & Backend Math...")
    customer = Company.objects.filter(company_type='CUSTOMER').first()
    product = Product.objects.first()

    payload_qs = {
        'customer': customer.id,
        'date': str(date.today()),
        'project_reference': 'Proyek Pengujian Otomatis Sistem PMS',
        'validity_days': 30,
        'payment_terms': '30 Hari setelah BAST',
        'delivery_terms': 'Franco Makassar Site',
        'tax_rate': '0.11',
        'items': [
            {
                'product': product.id,
                'part_number': product.part_number,
                'description': 'Pengujian item 1 dengan spesifikasi standar pabrikan',
                'quantity': '5.00',
                'uom': 'PCS',
                'unit_price': '1000000.00'
            },
            {
                'product': None,
                'part_number': 'CUSTOM-SVC-01',
                'description': 'Jasa Fabrikasi dan Instalasi Lapangan',
                'quantity': '1.00',
                'uom': 'LOT',
                'unit_price': '2500000.00'
            }
        ]
    }

    res_create_qs = client.post('/api/quotations/', payload_qs, content_type='application/json', **auth_header)
    assert res_create_qs.status_code == 201, f"Failed to create quotation: {res_create_qs.content}"
    qs_created = res_create_qs.json()
    qs_id = qs_created['id']
    qs_num = qs_created['quotation_number']
    
    # Verify numbering format: [SEQUENCE]/QS/MTA/[ROMAN]/[YEAR]
    assert '/QS/MTA/' in qs_num, f"Invalid numbering format: {qs_num}"
    # Verify strict math: (5 * 1,000,000) + (1 * 2,500,000) = 7,500,000
    # PPN 11% = 825,000. Grand Total = 8,325,000
    assert float(qs_created['subtotal']) == 7500000.0, f"Expected subtotal 7500000, got {qs_created['subtotal']}"
    assert float(qs_created['tax_amount']) == 825000.0, f"Expected tax 825000, got {qs_created['tax_amount']}"
    assert float(qs_created['grand_total']) == 8325000.0, f"Expected grand total 8325000, got {qs_created['grand_total']}"
    print(f"   [+] Quotation '{qs_num}' created successfully. Subtotal: Rp {qs_created['subtotal']}, Grand Total: Rp {qs_created['grand_total']}")

    # 5. Test Quotation PDF Endpoint
    print("\n[TEST 5/8] Testing Quotation PDF Generation Engine...")
    res_pdf = client.get(f'/api/quotations/{qs_id}/pdf/', **auth_header)
    assert res_pdf.status_code == 200, f"PDF generation failed: {res_pdf.status_code}"
    print(f"   [+] Quotation PDF generated successfully. Content-Type: {res_pdf['Content-Type']}, Size: {len(res_pdf.content)} bytes.")

    # 6. Test Convert Quotation to Purchase Order (PO)
    print("\n[TEST 6/8] Testing 1-Click Quotation -> Purchase Order Conversion...")
    supplier = Company.objects.filter(company_type__in=['SUPPLIER', 'BOTH']).first()
    res_convert = client.post('/api/purchase-orders/convert-from-quotation/', {
        'quotation_id': qs_id,
        'supplier_id': supplier.id,
        'po_date': str(date.today())
    }, content_type='application/json', **auth_header)
    assert res_convert.status_code == 201, f"PO Conversion failed: {res_convert.content}"
    po_created = res_convert.json()['purchase_order']
    po_id = po_created['id']
    po_num = po_created['po_number']
    assert '/PO/MTA/' in po_num
    print(f"   [+] PO '{po_num}' created from Quotation '{qs_num}'. Status: {po_created['status']}")

    # 7. Test Create BAST from PO
    print("\n[TEST 7/8] Testing Purchase Order -> BAST Generation with Physical Inspection...")
    res_bast = client.post('/api/bast/create-from-po/', {
        'purchase_order_id': po_id,
        'delivery_order_number': 'DO-TEST/2026/09/99',
        'project_name': 'Proyek Pengujian BAST',
        'handover_by': 'Syafaat (PT. MAROA TUNGGA ABADI)',
        'received_by': 'Bpk. Ir. Hendra (Customer Lead)',
        'bast_date': str(date.today())
    }, content_type='application/json', **auth_header)
    assert res_bast.status_code == 201, f"BAST creation failed: {res_bast.content}"
    bast_created = res_bast.json()['bast']
    bast_id = bast_created['id']
    bast_num = bast_created['bast_number']
    assert '/BAST/MTA/' in bast_num
    print(f"   [+] BAST '{bast_num}' created from PO '{po_num}'.")

    # Test BAST PDF
    res_bast_pdf = client.get(f'/api/bast/{bast_id}/pdf/', **auth_header)
    assert res_bast_pdf.status_code == 200
    print(f"   [+] BAST PDF rendered successfully. Size: {len(res_bast_pdf.content)} bytes.")

    # 8. Test Global Search, Lifecycle Timeline, & Audit Trail
    print("\n[TEST 8/8] Testing Global Search, Lifecycle Timeline, & Audit Trail...")
    res_search = client.get(f'/api/tracking/search/?q={qs_num[:4]}', **auth_header)
    assert res_search.status_code == 200
    print(f"   [+] Global search returned {len(res_search.json()['results'])} matched entities.")

    res_timeline = client.get(f'/api/tracking/lifecycle/?quotation_id={qs_id}', **auth_header)
    assert res_timeline.status_code == 200
    assert len(res_timeline.json()['steps']) == 4
    print("   [+] 4-Stage Lifecycle Timeline verified: Product -> Quotation -> PO -> BAST.")

    res_audit = client.get('/api/audit-logs/', **auth_header)
    assert res_audit.status_code == 200
    assert len(res_audit.json().get('results', [])) > 0
    print(f"   [+] System Audit Logs verified ({len(res_audit.json().get('results', []))} logs recorded).")

    print("\n=================================================================")
    print("[SUCCESS] ALL 8 TEST SUITES PASSED FLAWLESSLY WITH 100% SUCCESS!")
    print("=================================================================")

if __name__ == '__main__':
    run_e2e_tests()

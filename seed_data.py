"""
Maroa PMS Database Seeding Script
PT. MAROA TUNGGA ABADI (General Supplier & Contractor)
Creates pre-configured accounts (syafaat, safar, surya / 1114ROA),
Master Companies, Master Products, Sample Quotations, POs, and BAST.
"""

import os
import django
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maroa_pms.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from companies.models import Company
from products.models import ProductCategory, Product
from quotations.models import Quotation, QuotationItem
from purchase_orders.models import PurchaseOrder, PurchaseOrderItem
from bast.models import BAST, BASTItem
from audit_logs.models import AuditLog

def seed_database():
    print(">>> [1/6] Seeding Pre-Configured Accounts (Password: 1114ROA)...")
    
    users_data = [
        {
            'username': 'safar',
            'email': 'safar@maroa-tungga.co.id',
            'first_name': 'Muh. Safar',
            'last_name': 'Alparel',
            'full_name': 'Muh. Safar Alparel',
            'jabatan': 'Direktur',
            'role': UserProfile.ROLE_ADMIN,
            'department': 'Direksi',
            'phone': '0852 5600 6119',
            'is_staff': True,
            'is_superuser': True
        },
        {
            'username': 'surya',
            'email': 'surya@maroa-tungga.co.id',
            'first_name': 'Surya',
            'last_name': '',
            'full_name': 'Surya',
            'jabatan': 'Operational Manager',
            'role': UserProfile.ROLE_PROCUREMENT,
            'department': 'Operations',
            'phone': '0812 3456 7890',
            'is_staff': True,
            'is_superuser': False
        },
        {
            'username': 'syafaat',
            'email': 'syafaat@maroa-tungga.co.id',
            'first_name': 'Syafaat',
            'last_name': '',
            'full_name': 'Syafaat',
            'jabatan': 'Staff Procurement',
            'role': UserProfile.ROLE_PROCUREMENT,
            'department': 'Procurement',
            'phone': '0813 4567 8901',
            'is_staff': False,
            'is_superuser': False
        }
    ]

    user_objs = {}
    for u_data in users_data:
        role = u_data.pop('role')
        dept = u_data.pop('department')
        phone = u_data.pop('phone')
        full_name = u_data.pop('full_name')
        jabatan = u_data.pop('jabatan')
        
        user, created = User.objects.get_or_create(username=u_data['username'], defaults=u_data)
        user.set_password('1114ROA')
        user.is_active = True
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.department = dept
        profile.phone = phone
        profile.full_name = full_name
        profile.jabatan = jabatan
        profile.save()
        user_objs[user.username] = user
        print(f"   [+] User '{user.username}' ({profile.jabatan}) created/updated.")

    print("\n>>> [2/6] Seeding Master Companies (Customers & Suppliers)...")
    companies_data = [
        # Customers
        {
            'company_name': 'PT SINAR TERANG MANDIRI',
            'company_type': 'CUSTOMER',
            'contact_person': 'Purchasing Dept',
            'phone': '0411-888999',
            'email': 'purchasing@sinarterangmandiri.co.id',
            'address': 'Makassar, Sulawesi Selatan',
            'city': 'Makassar',
            'tax_number': '01.000.567.8-051.000'
        },
        {
            'company_name': 'PT TRAKINDO UTAMA',
            'company_type': 'CUSTOMER',
            'contact_person': 'Supply Chain Officer',
            'phone': '0411-510100',
            'email': 'procurement.mks@trakindo.co.id',
            'address': 'Jl. Kima 8 Kav. SS No. 2, Kawasan Industri Makassar',
            'city': 'Makassar',
            'tax_number': '01.060.789.2-801.000'
        },
        {
            'company_name': 'PT GUNUNG SAMUDERA INTERNASIONAL',
            'company_type': 'CUSTOMER',
            'contact_person': 'Procurement Lead',
            'phone': '0411-456789',
            'email': 'purchasing@gunungsamudera.co.id',
            'address': 'Kawasan Pelabuhan Makassar',
            'city': 'Makassar',
            'tax_number': '01.001.234.5-092.000'
        },
        {
            'company_name': 'PT KOREA ENERGI',
            'company_type': 'CUSTOMER',
            'contact_person': 'Project Manager',
            'phone': '0411-333444',
            'email': 'procurement@koreaenergi.co.id',
            'address': 'Makassar Energy Tower',
            'city': 'Makassar',
            'tax_number': '01.300.999.4-805.000'
        },
        {
            'company_name': 'PT TIGA PILAR ENERGI',
            'company_type': 'CUSTOMER',
            'contact_person': 'Material Controller',
            'phone': '0411-777888',
            'email': 'order@tigapilarenergi.co.id',
            'address': 'Jl. Perintis Kemerdekaan KM. 12, Makassar',
            'city': 'Makassar',
            'tax_number': '01.000.123.4-052.000'
        },
        # Suppliers
        {
            'company_name': 'PT. KITZ Valve & Instrumentation Indonesia',
            'company_type': 'SUPPLIER',
            'contact_person': 'Andi Pratama (Sales Engineer)',
            'phone': '(021) 898-3321',
            'email': 'sales@kitzvalves.co.id',
            'address': 'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
            'city': 'Bekasi',
            'tax_number': '01.888.777.6-413.000'
        },
        {
            'company_name': 'PT. Schneider Electric Indonesia',
            'company_type': 'SUPPLIER',
            'contact_person': 'Rian Gunawan (Distributor Lead)',
            'phone': '(021) 750-4406',
            'email': 'indonesia.orders@se.com',
            'address': 'Ventura Building 7th Fl, Jl. R.A. Kartini No. 26, Jakarta',
            'city': 'Jakarta Selatan',
            'tax_number': '01.345.678.9-062.000'
        },
        {
            'company_name': 'PT. Grundfos Pompa Indonesia',
            'company_type': 'SUPPLIER',
            'contact_person': 'Kevin Sanjaya (Industrial Sales)',
            'phone': '(021) 2555-6677',
            'email': 'orders-id@grundfos.com',
            'address': 'Jl. Rawa Sumur III Blok III BB No. 1, Pulogadung, Jakarta',
            'city': 'Jakarta Timur',
            'tax_number': '01.444.555.6-003.000'
        },
        {
            'company_name': 'PT. Pipa Mas Putih Pratama',
            'company_type': 'SUPPLIER',
            'contact_person': 'Sugeng Widodo',
            'phone': '(031) 749-1122',
            'email': 'marketing@pipamasputih.co.id',
            'address': 'Kawasan Industri Margomulyo Permai Blok H-10, Surabaya',
            'city': 'Surabaya',
            'tax_number': '02.111.222.3-604.000'
        },
        # Both
        {
            'company_name': 'PT. Bosowa Corporindo',
            'company_type': 'BOTH',
            'contact_person': 'Muhammad Arif',
            'phone': '(0411) 872-999',
            'email': 'procurement@bosowa.co.id',
            'address': 'Menara Bosowa Lt. 18, Jl. Jend. Sudirman No. 5, Makassar',
            'city': 'Makassar',
            'tax_number': '01.222.333.4-805.000'
        }
    ]

    comp_objs = {}
    for c_data in companies_data:
        comp, _ = Company.objects.get_or_create(company_name=c_data['company_name'], defaults=c_data)
        comp_objs[c_data['company_name']] = comp
        print(f"   [+] Company '{comp.company_name}' ({comp.company_type}) saved.")

    print("\n>>> [3/6] Seeding Master Product Categories & Catalog...")
    categories_data = [
        ('Valves & Actuators', 'Industrial gate, globe, ball, and check valves for high pressure/temperature lines'),
        ('Pumps & Rotating Equipment', 'Centrifugal, submersible, slurry, and dosing pumps for industrial fluids'),
        ('Piping & Fittings', 'Carbon steel, stainless steel ASTM pipes, flanges, elbows, and reducers'),
        ('Electrical & Instrumentation', 'Industrial switchgears, circuit breakers, sensors, transmitters, and cable trays'),
        ('Safety & Industrial Supplies', 'Personal Protective Equipment (PPE), safety valves, filters, and gaskets'),
    ]

    cat_objs = {}
    for name, desc in categories_data:
        cat, _ = ProductCategory.objects.get_or_create(name=name, defaults={'description': desc})
        cat_objs[name] = cat

    products_data = [
        {
            'part_number': 'VLV-BL-KITZ-4IN-150',
            'description': 'Ball Valve 4 Inch Class 150 Flanged End Carbon Steel Body WCB with SS316 Trim Lever Operated',
            'specification': 'Size: 4 Inch, Rating: ANSI 150#, Body: WCB ASTM A216, Ball/Stem: SS316, Seat: PTFE, Flanged RF ASME B16.5',
            'brand': 'KITZ',
            'category': cat_objs['Valves & Actuators'],
            'default_uom': 'PCS',
            'price_estimate': Decimal('8750000.00'),
        },
        {
            'part_number': 'VLV-GT-KITZ-6IN-300',
            'description': 'Gate Valve 6 Inch Class 300 Cast Steel Flanged End Handwheel Operated Rising Stem',
            'specification': 'Size: 6 Inch, Rating: Class 300#, Body: A216 WCB, Trim: 13Cr/Stellite, Bolted Bonnet, Design: API 600',
            'brand': 'KITZ',
            'category': cat_objs['Valves & Actuators'],
            'default_uom': 'PCS',
            'price_estimate': Decimal('17400000.00'),
        },
        {
            'part_number': 'PMP-CR-GRUNDFOS-15-8',
            'description': 'Vertical Multistage Centrifugal Pump CR 15-8 A-F-A-E-HQQE 3x400V 50Hz 7.5kW',
            'specification': 'Flow: 15 m3/h, Head: 90 m, Motor: 7.5 kW 3-Phase IE3, Stainless Steel AISI 304 wetted parts',
            'brand': 'GRUNDFOS',
            'category': cat_objs['Pumps & Rotating Equipment'],
            'default_uom': 'UNIT',
            'price_estimate': Decimal('36500000.00'),
        },
        {
            'part_number': 'PIP-CS-SCH40-4IN-6M',
            'description': 'Seamless Carbon Steel Pipe 4 Inch SCH 40 ASTM A106 Grade B Length 6 Meters Beveled Ends',
            'specification': 'OD: 114.3 mm, Wall Thickness: 6.02 mm, Standard: ASTM A106 Gr. B / ASME B36.10, Length: 6000 mm',
            'brand': 'Bakrie / Spindo',
            'category': cat_objs['Piping & Fittings'],
            'default_uom': 'MTR',
            'price_estimate': Decimal('485000.00'),
        },
        {
            'part_number': 'FLG-WN-150-4IN-SS316',
            'description': 'Weld Neck Flange 4 Inch Class 150 Raised Face Stainless Steel ASTM A182 F316/316L',
            'specification': 'Size: 4 Inch, Schedule: SCH 40, Rating: 150#, Material: ASTM A182 F316/316L RF',
            'brand': 'Ulma / Melesi',
            'category': cat_objs['Piping & Fittings'],
            'default_uom': 'PCS',
            'price_estimate': Decimal('1250000.00'),
        },
        {
            'part_number': 'ELC-MCCB-NSX250F-3P',
            'description': 'Molded Case Circuit Breaker Compact NSX250F 3P 3D 250A TMD Trip Unit 36kA 415V',
            'specification': 'Poles: 3P, In: 250A, Breaking Cap: 36kA @ 415VAC, Trip: Thermal-Magnetic TM-D, Standard: IEC 60947-2',
            'brand': 'Schneider Electric',
            'category': cat_objs['Electrical & Instrumentation'],
            'default_uom': 'UNIT',
            'price_estimate': Decimal('4950000.00'),
        },
        {
            'part_number': 'INS-PT-YOKOGAWA-EJA530E',
            'description': 'Gauge Pressure Transmitter Model EJA530E Gauge Pressure 0.1 to 10 MPa Hart 4-20mA Output',
            'specification': 'Process Conn: 1/2 NPT Female, Diaphragm: Hastelloy C-276, Housing: Aluminum, IP66/IP67, Explosion Proof',
            'brand': 'Yokogawa',
            'category': cat_objs['Electrical & Instrumentation'],
            'default_uom': 'UNIT',
            'price_estimate': Decimal('19800000.00'),
        },
        {
            'part_number': 'SFT-GSK-SWG-4IN-150',
            'description': 'Spiral Wound Gasket 4 Inch 150# SS316 with Graphite Filler and Carbon Steel Outer Ring ASME B16.20',
            'specification': 'Size: 4 Inch, Thickness: 4.5 mm, Inner/Winding: SS316, Filler: Flexible Graphite, Outer Ring: CS',
            'brand': 'Flexitallic',
            'category': cat_objs['Safety & Industrial Supplies'],
            'default_uom': 'PCS',
            'price_estimate': Decimal('185000.00'),
        }
    ]

    prod_objs = {}
    for p_data in products_data:
        p, _ = Product.objects.get_or_create(part_number=p_data['part_number'], defaults=p_data)
        prod_objs[p_data['part_number']] = p
        print(f"   [+] Product '{p.part_number}' created.")

    print("\n>>> [4/6] Seeding Quotations with Automatic Numbering & Formulas...")
    today = date.today()

    # Quotation 1: Approved / Converted for PT Vale Indonesia
    q1_num = Quotation.generate_number(today - timedelta(days=15))
    q1 = Quotation.objects.create(
        quotation_number=q1_num,
        date=today - timedelta(days=15),
        customer=comp_objs['PT. Vale Indonesia Tbk'],
        project_reference='Tender Pengadaan Replacement Valve High Pressure Boiler Sorowako',
        validity_days=30,
        payment_terms='30 Hari Kalender setelah BAST ditandatangani',
        delivery_terms='Franco Site Sorowako Warehouse',
        internal_notes='Margin 22%, diskon distributor KITZ 15% secured.',
        status='APPROVED',
        tax_rate=Decimal('0.11'),
        created_by=user_objs['syafaat']
    )
    QuotationItem.objects.create(
        quotation=q1,
        product=prod_objs['VLV-BL-KITZ-4IN-150'],
        part_number='VLV-BL-KITZ-4IN-150',
        description=prod_objs['VLV-BL-KITZ-4IN-150'].description,
        quantity=Decimal('8.00'),
        uom='PCS',
        unit_price=Decimal('8750000.00'),
        order_index=1
    )
    QuotationItem.objects.create(
        quotation=q1,
        product=prod_objs['VLV-GT-KITZ-6IN-300'],
        part_number='VLV-GT-KITZ-6IN-300',
        description=prod_objs['VLV-GT-KITZ-6IN-300'].description,
        quantity=Decimal('4.00'),
        uom='PCS',
        unit_price=Decimal('17400000.00'),
        order_index=2
    )
    QuotationItem.objects.create(
        quotation=q1,
        product=prod_objs['SFT-GSK-SWG-4IN-150'],
        part_number='SFT-GSK-SWG-4IN-150',
        description=prod_objs['SFT-GSK-SWG-4IN-150'].description,
        quantity=Decimal('16.00'),
        uom='PCS',
        unit_price=Decimal('185000.00'),
        order_index=3
    )
    q1.recalculate_totals()
    print(f"   [+] Quotation 1 '{q1.quotation_number}' created. Total: Rp {q1.grand_total:,.2f}")

    # Quotation 2: Sent to PT Semen Tonasa
    q2_num = Quotation.generate_number(today - timedelta(days=8))
    q2 = Quotation.objects.create(
        quotation_number=q2_num,
        date=today - timedelta(days=8),
        customer=comp_objs['PT. Semen Tonasa (Persero)'],
        project_reference='Pengadaan Unit Pompa Transfer Slurry & Electrical Panel Pabrik Tonasa V',
        validity_days=45,
        payment_terms='DP 30%, Pelunasan 70% setelah BAST',
        delivery_terms='Franco Pabrik Semen Tonasa Pangkep',
        status='SENT',
        tax_rate=Decimal('0.11'),
        created_by=user_objs['safar']
    )
    QuotationItem.objects.create(
        quotation=q2,
        product=prod_objs['PMP-CR-GRUNDFOS-15-8'],
        part_number='PMP-CR-GRUNDFOS-15-8',
        description=prod_objs['PMP-CR-GRUNDFOS-15-8'].description,
        quantity=Decimal('2.00'),
        uom='UNIT',
        unit_price=Decimal('36500000.00'),
        order_index=1
    )
    QuotationItem.objects.create(
        quotation=q2,
        product=prod_objs['ELC-MCCB-NSX250F-3P'],
        part_number='ELC-MCCB-NSX250F-3P',
        description=prod_objs['ELC-MCCB-NSX250F-3P'].description,
        quantity=Decimal('6.00'),
        uom='UNIT',
        unit_price=Decimal('4950000.00'),
        order_index=2
    )
    q2.recalculate_totals()
    print(f"   [+] Quotation 2 '{q2.quotation_number}' created. Total: Rp {q2.grand_total:,.2f}")

    # Quotation 3: Draft for PT Aneka Tambang
    q3_num = Quotation.generate_number(today - timedelta(days=2))
    q3 = Quotation.objects.create(
        quotation_number=q3_num,
        date=today - timedelta(days=2),
        customer=comp_objs['PT. Aneka Tambang Tbk (UBPN Kolaka)'],
        project_reference='Pengadaan Instrumentasi Transmitter & Pipa Seamless Pabrik Feni Pomalaa',
        validity_days=30,
        status='DRAFT',
        tax_rate=Decimal('0.11'),
        created_by=user_objs['surya']
    )
    QuotationItem.objects.create(
        quotation=q3,
        product=prod_objs['INS-PT-YOKOGAWA-EJA530E'],
        part_number='INS-PT-YOKOGAWA-EJA530E',
        description=prod_objs['INS-PT-YOKOGAWA-EJA530E'].description,
        quantity=Decimal('3.00'),
        uom='UNIT',
        unit_price=Decimal('19800000.00'),
        order_index=1
    )
    QuotationItem.objects.create(
        quotation=q3,
        product=prod_objs['PIP-CS-SCH40-4IN-6M'],
        part_number='PIP-CS-SCH40-4IN-6M',
        description=prod_objs['PIP-CS-SCH40-4IN-6M'].description,
        quantity=Decimal('120.00'),
        uom='MTR',
        unit_price=Decimal('485000.00'),
        order_index=2
    )
    q3.recalculate_totals()
    print(f"   [+] Quotation 3 '{q3.quotation_number}' created. Total: Rp {q3.grand_total:,.2f}")

    print("\n>>> [5/6] Seeding Purchase Order (PO) & BAST...")
    # Convert Quotation 1 into PO
    po1_num = PurchaseOrder.generate_number(today - timedelta(days=10))
    po1 = PurchaseOrder.objects.create(
        po_number=po1_num,
        quotation=q1,
        supplier=comp_objs['PT. KITZ Valve & Instrumentation Indonesia'],
        po_date=today - timedelta(days=10),
        expected_delivery_date=today + timedelta(days=14),
        delivery_address='Gudang Logistik PT. MAROA TUNGGA ABADI, Komp Pasar Segar RA-15 Makassar',
        payment_terms='30 Hari setelah barang & sertifikat uji diterima',
        status='ISSUED',
        tax_rate=Decimal('0.11'),
        created_by=user_objs['safar']
    )
    for q_item in q1.items.all():
        PurchaseOrderItem.objects.create(
            purchase_order=po1,
            quotation_item=q_item,
            product=q_item.product,
            part_number=q_item.part_number,
            description=q_item.description,
            quantity=q_item.quantity,
            uom=q_item.uom,
            unit_price=q_item.unit_price * Decimal('0.85'), # Vendor cost at 85%
            order_index=q_item.order_index
        )
    po1.recalculate_totals()
    q1.status = 'CONVERTED'
    q1.save(update_fields=['status'])
    print(f"   [+] Purchase Order '{po1.po_number}' created for {po1.supplier.company_name}.")

    # Create BAST for PO 1
    bast1_num = BAST.generate_number(today - timedelta(days=3))
    bast1 = BAST.objects.create(
        bast_number=bast1_num,
        purchase_order=po1,
        customer=q1.customer,
        bast_date=today - timedelta(days=3),
        delivery_order_number='DO-MTA/2026/09/042',
        project_name='Proyek Penggantian Valve Boiler PT Vale Indonesia Sorowako',
        inspector_name='Ir. Hendra Wijaya / Bpk. Taufik (Lead QC Vale)',
        handover_by='Syafaat / Safar (PT. MAROA TUNGGA ABADI)',
        received_by='Ir. Hendra Wijaya (Supply Chain Mgr Vale)',
        status='SIGNED',
        notes='Semua valve telah diuji tekanan hidrostatik (Hydrostatic Test 1.5x WP) dan dilengkapi Mill Certificate asli.',
        created_by=user_objs['syafaat']
    )
    for p_item in po1.items.all():
        BASTItem.objects.create(
            bast=bast1,
            po_item=p_item,
            product=p_item.product,
            part_number=p_item.part_number,
            description=p_item.description,
            ordered_quantity=p_item.quantity,
            received_quantity=p_item.quantity,
            uom=p_item.uom,
            condition_status='GOOD',
            notes='Kondisi baru 100% dan lolos inspeksi QC',
            order_index=p_item.order_index
        )
    print(f"   [+] BAST '{bast1.bast_number}' created with status SIGNED.")

    print("\n>>> [6/6] Seeding Initial Audit Logs...")
    AuditLog.objects.create(
        user=user_objs['syafaat'],
        user_name='syafaat',
        action='LOGIN',
        module='ACCOUNTS',
        object_repr='User syafaat logged into MAROA PMS',
        ip_address='127.0.0.1',
        details={'browser': 'Chrome/124.0.0.0 Windows 11', 'role': 'ADMIN'}
    )
    AuditLog.objects.create(
        user=user_objs['syafaat'],
        user_name='syafaat',
        action='CREATE',
        module='QUOTATIONS',
        object_id=str(q1.id),
        object_repr=f"Quotation: {q1.quotation_number}",
        ip_address='127.0.0.1',
        details={'grand_total': str(q1.grand_total), 'customer': q1.customer.company_name}
    )
    AuditLog.objects.create(
        user=user_objs['safar'],
        user_name='safar',
        action='CONVERT',
        module='QUOTATIONS',
        object_id=str(q1.id),
        object_repr=f"Quotation {q1.quotation_number} converted to PO {po1.po_number}",
        ip_address='127.0.0.1'
    )
    AuditLog.objects.create(
        user=user_objs['syafaat'],
        user_name='syafaat',
        action='CREATE',
        module='BAST',
        object_id=str(bast1.id),
        object_repr=f"BAST: {bast1.bast_number}",
        ip_address='127.0.0.1'
    )
    print("   [+] Audit Logs recorded.")

    print("\n========================================================")
    print("[SUCCESS] DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    print("Pre-configured Credentials:")
    print("  • User 1: syafaat (Role: ADMIN)        | Pass: 1114ROA")
    print("  • User 2: safar   (Role: PROCUREMENT)  | Pass: 1114ROA")
    print("  • User 3: surya   (Role: STAFF/VIEWER) | Pass: 1114ROA")
    print("========================================================")

if __name__ == '__main__':
    seed_database()

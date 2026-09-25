import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'maroa_pms.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from companies.models import Company

# 1. Update/Create Users & Jabatan
users_spec = [
    {
        'username': 'safar',
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
        'first_name': 'Syafaat',
        'last_name': '',
        'full_name': 'Syafaat',
        'jabatan': 'Staff Procurement',
        'role': UserProfile.ROLE_PROCUREMENT,
        'department': 'Procurement',
        'phone': '0813 4567 8901',
        'is_staff': False,
        'is_superuser': False
    },
]

for spec in users_spec:
    u, created = User.objects.get_or_create(username=spec['username'])
    u.first_name = spec['first_name']
    u.last_name = spec['last_name']
    u.set_password('1114ROA')
    u.is_active = True
    u.is_staff = spec['is_staff']
    u.is_superuser = spec['is_superuser']
    u.save()

    prof, _ = UserProfile.objects.get_or_create(user=u)
    prof.full_name = spec['full_name']
    prof.jabatan = spec['jabatan']
    prof.role = spec['role']
    prof.department = spec['department']
    prof.phone = spec['phone']
    prof.save()
    print(f"User {u.username} set to: {prof.full_name} | Jabatan: {prof.jabatan}")

# 2. Update Customer Companies list
new_customers = [
    {
        'company_name': 'PT SINAR TERANG MANDIRI',
        'city': 'Makassar',
        'address': 'Makassar, Sulawesi Selatan',
        'contact_person': 'Purchasing Dept',
        'email': 'purchasing@sinarterangmandiri.co.id',
        'phone': '0411-888999'
    },
    {
        'company_name': 'PT TRAKINDO UTAMA',
        'city': 'Makassar',
        'address': 'Jl. Kima 8 Kav. SS No. 2, Kawasan Industri Makassar',
        'contact_person': 'Supply Chain Officer',
        'email': 'procurement.mks@trakindo.co.id',
        'phone': '0411-510100'
    },
    {
        'company_name': 'PT GUNUNG SAMUDERA INTERNASIONAL',
        'city': 'Makassar',
        'address': 'Kawasan Pelabuhan Makassar',
        'contact_person': 'Procurement Lead',
        'email': 'purchasing@gunungsamudera.co.id',
        'phone': '0411-456789'
    },
    {
        'company_name': 'PT KOREA ENERGI',
        'city': 'Makassar',
        'address': 'Makassar Energy Tower',
        'contact_person': 'Project Manager',
        'email': 'procurement@koreaenergi.co.id',
        'phone': '0411-333444'
    },
    {
        'company_name': 'PT TIGA PILAR ENERGI',
        'city': 'Makassar',
        'address': 'Jl. Perintis Kemerdekaan KM. 12, Makassar',
        'contact_person': 'Material Controller',
        'email': 'order@tigapilarenergi.co.id',
        'phone': '0411-777888'
    },
]

# Create or update the 5 requested customers
target_names = [c['company_name'] for c in new_customers]
for cust in new_customers:
    obj, created = Company.objects.update_or_create(
        company_name=cust['company_name'],
        defaults={
            'company_type': 'CUSTOMER',
            'city': cust['city'],
            'address': cust['address'],
            'contact_person': cust['contact_person'],
            'email': cust['email'],
            'phone': cust['phone'],
            'is_active': True
        }
    )
    print(f"Customer saved: {obj.company_name} (Created: {created})")

# Re-link any existing documents referencing old customers to PT SINAR TERANG MANDIRI, then deactivate old ones
sinar_terang = Company.objects.get(company_name='PT SINAR TERANG MANDIRI')
from quotations.models import Quotation
from purchase_orders.models import PurchaseOrder
from bast.models import BAST

for old_c in Company.objects.filter(company_type='CUSTOMER').exclude(company_name__in=target_names):
    Quotation.objects.filter(customer=old_c).update(customer=sinar_terang, customer_name_text=sinar_terang.company_name)
    BAST.objects.filter(customer=old_c).update(customer=sinar_terang)
    old_c.is_active = False
    old_c.save()
    try:
        old_c.delete()
    except Exception:
        pass

print("Update completed successfully!")

from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
from companies.models import Company
from products.models import Product
from core.models import DocumentSequence

class Quotation(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent to Customer'),
        ('APPROVED', 'Approved by Customer'),
        ('REJECTED', 'Rejected / Expired'),
        ('CONVERTED', 'Converted to Purchase Order'),
        ('CANCELLED', 'Cancelled'),
    ]

    TAX_RATE_CHOICES = [
        (Decimal('0.11'), '11% PPN (Pajak Pertambahan Nilai)'),
        (Decimal('0.00'), '0% Non-PPN'),
    ]

    quotation_number = models.CharField(max_length=100, unique=True, db_index=True)
    date = models.DateField(db_index=True)
    customer = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations')
    customer_name_text = models.CharField(max_length=255, blank=True, default="PT SINAR TERANG MANDIRI", help_text="Direct client name input")
    location = models.CharField(max_length=100, blank=True, default="Makassar")
    keterangan = models.CharField(max_length=255, blank=True, default="WBN", help_text="Keterangan e.g. WBN / MBMA / Project Ref")
    project_reference = models.CharField(max_length=255, blank=True, help_text="Project / RFQ / Tender Reference")
    validity_days = models.PositiveIntegerField(default=30, help_text="Quotation validity period in days")
    payment_terms = models.CharField(max_length=255, default="TOP 30 Hari", help_text="Payment Terms")
    delivery_terms = models.CharField(max_length=255, default="Franco Site", help_text="Delivery Terms & Conditions")
    internal_notes = models.TextField(blank=True, help_text="Internal procurement and pricing notes")
    customer_notes = models.TextField(
        blank=True, 
        default="1. Harga sudah termasuk pengiriman Franco Site\n2. Mohon diinfokan sebelum melakukan pemesanan karena stok produk terbatas\n3. Surat penawaran ini bukan merupakan bukti ikatan transaksi\n4. TOP 30 Hari", 
        help_text="Catatan di surat penawaran"
    )
    contact_person_name = models.CharField(max_length=150, blank=True, default="Muh. Safar Alparel (0852 5600 6119)")
    signer_name = models.CharField(max_length=150, blank=True, default="Muh. Safar Alparel")
    signer_title = models.CharField(max_length=100, blank=True, default="Direktur")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', db_index=True)

    # Financial breakdown (Calculated strictly server-side)
    subtotal = models.DecimalField(max_digits=17, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, choices=TAX_RATE_CHOICES, default=Decimal('0.11'))
    tax_amount = models.DecimalField(max_digits=17, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=17, decimal_places=2, default=Decimal('0.00'))

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_quotations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']
        indexes = [
            models.Index(fields=['quotation_number']),
            models.Index(fields=['status']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        client = self.customer_name_text or (self.customer.company_name if self.customer else 'No Client')
        return f"{self.quotation_number} - {client} ({self.status})"

    def recalculate_totals(self):
        items = self.items.all()
        subtotal_acc = Decimal('0.00')
        for item in items:
            item_row_total = (Decimal(str(item.quantity)) * Decimal(str(item.unit_price))).quantize(Decimal('0.01'))
            if item.row_total != item_row_total:
                item.row_total = item_row_total
                item.save(update_fields=['row_total'])
            subtotal_acc += item_row_total

        self.subtotal = subtotal_acc.quantize(Decimal('0.01'))
        tax_rate_val = Decimal(str(self.tax_rate or 0))
        self.tax_amount = (self.subtotal * tax_rate_val).quantize(Decimal('0.01'))
        self.grand_total = (self.subtotal + self.tax_amount).quantize(Decimal('0.01'))
        self.save(update_fields=['subtotal', 'tax_amount', 'grand_total', 'updated_at'])

    @classmethod
    def generate_number(cls, date_obj=None):
        """Generate safe, sequential quotation number."""
        return DocumentSequence.get_next_number(doc_type='QUOTATION', code='QS', target_date=date_obj)

def validate_max_200_words(value):
    if not value:
        return
    word_count = len(str(value).split())
    if word_count > 200:
        raise ValidationError(f"Deskripsi melebihi batas maksimum 200 kata (saat ini {word_count} kata).")

class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotation_items')
    part_number = models.CharField(max_length=100, blank=True, default='', help_text="MPN / Part Number")
    specification = models.CharField(max_length=255, blank=True, default='', help_text="Spesifikasi / Size / Rating")
    description = models.TextField(validators=[validate_max_200_words], help_text="Deskripsi item barang")
    image = models.TextField(blank=True, default='', help_text="Data URL / Base64 image")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1.00'))
    uom = models.CharField(max_length=20, default='PC')
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    row_total = models.DecimalField(max_digits=17, decimal_places=2, default=Decimal('0.00'))
    order_index = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order_index', 'id']

    def clean(self):
        super().clean()
        validate_max_200_words(self.description)

    def save(self, *args, **kwargs):
        self.row_total = (Decimal(str(self.quantity or 0)) * Decimal(str(self.unit_price or 0))).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation.quotation_number} - Item {self.order_index}: {self.part_number}"

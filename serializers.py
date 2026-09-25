from rest_framework import serializers
from decimal import Decimal
from datetime import date
from .models import Quotation, QuotationItem, validate_max_200_words
from companies.models import Company
from companies.serializers import CompanySerializer
from core.utils import format_rupiah

class QuotationItemSerializer(serializers.ModelSerializer):
    word_count = serializers.SerializerMethodField()
    row_total_formatted = serializers.SerializerMethodField()
    image = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = QuotationItem
        fields = [
            'id', 'quotation', 'product', 'part_number', 'specification', 'description', 'image',
            'quantity', 'uom', 'unit_price', 'row_total', 'row_total_formatted',
            'order_index', 'word_count'
        ]
        read_only_fields = ['quotation', 'row_total']

    def get_word_count(self, obj):
        return len(str(obj.description or '').split())

    def get_row_total_formatted(self, obj):
        return format_rupiah(obj.row_total)

    def validate_description(self, value):
        validate_max_200_words(value)
        return value

class QuotationSerializer(serializers.ModelSerializer):
    quotation_number = serializers.CharField(required=False, allow_blank=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False, allow_null=True)
    customer_name = serializers.SerializerMethodField()
    customer_name_text = serializers.CharField(required=False, allow_blank=True)
    items = QuotationItemSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Formatted Rupiah fields
    subtotal_formatted = serializers.SerializerMethodField()
    tax_amount_formatted = serializers.SerializerMethodField()
    grand_total_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'date', 'customer', 'customer_name', 'customer_name_text',
            'location', 'keterangan', 'project_reference', 'validity_days', 'payment_terms', 'delivery_terms',
            'internal_notes', 'customer_notes', 'contact_person_name', 'signer_name', 'signer_title',
            'status', 'status_display',
            'subtotal', 'subtotal_formatted', 'tax_rate', 'tax_amount', 'tax_amount_formatted',
            'grand_total', 'grand_total_formatted', 'created_by', 'created_by_name',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['subtotal', 'tax_amount', 'grand_total', 'created_by', 'created_at', 'updated_at']

    def get_customer_name(self, obj):
        if obj.customer_name_text:
            return obj.customer_name_text
        if obj.customer:
            return obj.customer.company_name
        return "PT SINAR TERANG MANDIRI"

    def get_subtotal_formatted(self, obj):
        return format_rupiah(obj.subtotal)

    def get_tax_amount_formatted(self, obj):
        return format_rupiah(obj.tax_amount)

    def get_grand_total_formatted(self, obj):
        return format_rupiah(obj.grand_total)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # If quotation number not provided or empty, auto-generate
        q_num = validated_data.get('quotation_number', '').strip()
        if not q_num:
            target_date = validated_data.get('date') or date.today()
            validated_data['quotation_number'] = Quotation.generate_number(target_date)

        # Set customer name fallback
        if not validated_data.get('customer_name_text') and validated_data.get('customer'):
            validated_data['customer_name_text'] = validated_data['customer'].company_name

        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        quotation = Quotation.objects.create(**validated_data)

        # Create line items
        subtotal_acc = Decimal('0.00')
        for idx, item_data in enumerate(items_data, start=1):
            qty = Decimal(str(item_data.get('quantity', 1)))
            unit_p = Decimal(str(item_data.get('unit_price', 0)))
            row_total = (qty * unit_p).quantize(Decimal('0.01'))
            subtotal_acc += row_total

            QuotationItem.objects.create(
                quotation=quotation,
                product=item_data.get('product'),
                part_number=item_data.get('part_number', ''),
                specification=item_data.get('specification', ''),
                description=item_data.get('description', ''),
                image=item_data.get('image', ''),
                quantity=qty,
                uom=item_data.get('uom', 'PC'),
                unit_price=unit_p,
                row_total=row_total,
                order_index=item_data.get('order_index', idx)
            )

        # Strictly recalculate backend totals
        quotation.subtotal = subtotal_acc.quantize(Decimal('0.01'))
        tax_rate_val = Decimal(str(quotation.tax_rate or 0))
        quotation.tax_amount = (quotation.subtotal * tax_rate_val).quantize(Decimal('0.01'))
        quotation.grand_total = (quotation.subtotal + quotation.tax_amount).quantize(Decimal('0.01'))
        quotation.save(update_fields=['subtotal', 'tax_amount', 'grand_total'])

        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            subtotal_acc = Decimal('0.00')
            for idx, item_data in enumerate(items_data, start=1):
                qty = Decimal(str(item_data.get('quantity', 1)))
                unit_p = Decimal(str(item_data.get('unit_price', 0)))
                row_total = (qty * unit_p).quantize(Decimal('0.01'))
                subtotal_acc += row_total

                QuotationItem.objects.create(
                    quotation=instance,
                    product=item_data.get('product'),
                    part_number=item_data.get('part_number', ''),
                    specification=item_data.get('specification', ''),
                    description=item_data.get('description', ''),
                    image=item_data.get('image', ''),
                    quantity=qty,
                    uom=item_data.get('uom', 'PC'),
                    unit_price=unit_p,
                    row_total=row_total,
                    order_index=item_data.get('order_index', idx)
                )

            instance.subtotal = subtotal_acc.quantize(Decimal('0.01'))
            tax_rate_val = Decimal(str(instance.tax_rate or 0))
            instance.tax_amount = (instance.subtotal * tax_rate_val).quantize(Decimal('0.01'))
            instance.grand_total = (instance.subtotal + instance.tax_amount).quantize(Decimal('0.01'))
            instance.save(update_fields=['subtotal', 'tax_amount', 'grand_total', 'updated_at'])
        else:
            instance.recalculate_totals()

        return instance

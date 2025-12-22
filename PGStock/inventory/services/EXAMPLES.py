"""
Example: How to use services in views (Thin Views Pattern)

This file demonstrates how to refactor views to use the service layer.
DO NOT import this file - it's for documentation only.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction

from inventory.services import (
    StockService, InvoiceService, ReceiptService, PaymentService
)
from inventory.services.base import ServiceException
from inventory.models import Invoice, Product, PointOfSale
from inventory.forms import InvoiceForm, InvoiceItemFormSet


# ============================================================================
# EXAMPLE 1: Invoice Creation (BEFORE vs AFTER)
# ============================================================================

# BEFORE (Fat View - 50+ lines of business logic)
@login_required
@transaction.atomic
def invoice_create_OLD(request):
    """OLD WAY: Business logic mixed with view logic"""
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            invoice = form.save(commit=False)
            invoice.created_by = request.user
            
            # Auto-assign point of sale
            if not invoice.point_of_sale and hasattr(request.user, 'profile'):
                invoice.point_of_sale = request.user.profile.point_of_sale
            
            if not invoice.invoice_number:
                invoice.invoice_number = invoice.generate_invoice_number()
            invoice.save()
            
            # Save items
            items = formset.save(commit=False)
            for item in items:
                item.invoice = invoice
                item.save()
            
            # Calculate totals
            invoice.calculate_totals()
            
            # Deduct stock if paid/sent
            if invoice.status in ['paid', 'sent']:
                try:
                    invoice.deduct_stock()
                    messages.success(request, 'Facture créée et stock déduit!')
                except ValueError as e:
                    messages.warning(request, f'Facture créée mais erreur stock: {e}')
            else:
                messages.success(request, 'Facture créée!')
            
            return redirect('inventory:invoice_detail', pk=invoice.pk)
    else:
        form = InvoiceForm()
        formset = InvoiceItemFormSet()
    
    return render(request, 'inventory/invoice/invoice_form.html', {
        'form': form,
        'item_formset': formset
    })


# AFTER (Thin View - Clean and readable)
@login_required
def invoice_create_NEW(request):
    """NEW WAY: Delegate to service layer"""
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        
        if form.is_valid() and formset.is_valid():
            try:
                # Prepare items data
                items_data = []
                for item_form in formset:
                    if item_form.cleaned_data and not item_form.cleaned_data.get('DELETE'):
                        items_data.append({
                            'product': item_form.cleaned_data['product'],
                            'quantity': item_form.cleaned_data['quantity'],
                            'unit_price': item_form.cleaned_data['unit_price'],
                            'discount': item_form.cleaned_data.get('discount', 0),
                            'is_wholesale': item_form.cleaned_data.get('is_wholesale', False)
                        })
                
                # Call service
                invoice_service = InvoiceService()
                invoice = invoice_service.create_invoice(
                    client=form.cleaned_data['client'],
                    point_of_sale=form.cleaned_data.get('point_of_sale') or request.user.profile.point_of_sale,
                    user=request.user,
                    items_data=items_data,
                    status=form.cleaned_data.get('status', 'draft'),
                    apply_tax=form.cleaned_data.get('apply_tax', False),
                    tax_rate=form.cleaned_data.get('tax_rate', 0),
                    notes=form.cleaned_data.get('notes', '')
                )
                
                messages.success(request, f'Facture {invoice.invoice_number} créée avec succès!')
                return redirect('inventory:invoice_detail', pk=invoice.pk)
                
            except (ValidationError, ServiceException) as e:
                messages.error(request, f'Erreur: {str(e)}')
    else:
        form = InvoiceForm()
        formset = InvoiceItemFormSet()
    
    return render(request, 'inventory/invoice/invoice_form.html', {
        'form': form,
        'item_formset': formset
    })


# ============================================================================
# EXAMPLE 2: Stock Movement
# ============================================================================

@login_required
def stock_transfer(request):
    """Transfer stock between points of sale"""
    if request.method == 'POST':
        try:
            stock_service = StockService()
            
            movement = stock_service.process_transfer(
                product=get_object_or_404(Product, pk=request.POST['product_id']),
                quantity=request.POST['quantity'],
                from_point_of_sale=get_object_or_404(PointOfSale, pk=request.POST['from_pos']),
                to_point_of_sale=get_object_or_404(PointOfSale, pk=request.POST['to_pos']),
                user=request.user,
                notes=request.POST.get('notes', '')
            )
            
            messages.success(request, f'Transfert effectué: {movement.quantity} x {movement.product.name}')
            return redirect('inventory:movement_list')
            
        except (ValidationError, ServiceException) as e:
            messages.error(request, str(e))
    
    return render(request, 'inventory/movement/transfer_form.html')


# ============================================================================
# EXAMPLE 3: Payment Registration
# ============================================================================

@login_required
def register_payment(request, invoice_id):
    """Register a payment for an invoice"""
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    
    if request.method == 'POST':
        try:
            payment_service = PaymentService()
            
            payment = payment_service.register_payment(
                invoice=invoice,
                amount=request.POST['amount'],
                payment_method=request.POST['payment_method'],
                user=request.user,
                reference=request.POST.get('reference', ''),
                notes=request.POST.get('notes', '')
            )
            
            messages.success(request, f'Paiement de {payment.amount} enregistré!')
            return redirect('inventory:invoice_detail', pk=invoice.pk)
            
        except (ValidationError, ServiceException) as e:
            messages.error(request, str(e))
    
    # Get payment summary
    payment_service = PaymentService()
    summary = payment_service.get_payment_summary(invoice)
    
    return render(request, 'inventory/payment/payment_form.html', {
        'invoice': invoice,
        'summary': summary
    })


# ============================================================================
# EXAMPLE 4: Bulk Stock Update (Excel Import)
# ============================================================================

@login_required
def import_stock_from_excel(request):
    """Import stock updates from Excel file"""
    if request.method == 'POST' and request.FILES.get('excel_file'):
        try:
            # Parse Excel file (using your existing excel_utils)
            from inventory.excel_utils import parse_stock_excel
            updates = parse_stock_excel(request.FILES['excel_file'])
            
            # Process in bulk using service
            stock_service = StockService()
            movements = stock_service.bulk_update_inventory(
                updates=updates,
                user=request.user
            )
            
            messages.success(
                request,
                f'{len(movements)} mouvements créés sur {len(updates)} lignes.'
            )
            return redirect('inventory:movement_list')
            
        except Exception as e:
            messages.error(request, f'Erreur lors de l\'import: {str(e)}')
    
    return render(request, 'inventory/import/stock_import.html')


# ============================================================================
# EXAMPLE 5: Invoice Cancellation
# ============================================================================

@login_required
def cancel_invoice(request, invoice_id):
    """Cancel an invoice and restore stock"""
    invoice = get_object_or_404(Invoice, pk=invoice_id)
    
    if request.method == 'POST':
        try:
            invoice_service = InvoiceService()
            invoice_service.cancel_invoice(invoice, request.user)
            
            messages.success(
                request,
                f'Facture {invoice.invoice_number} annulée et stock restauré.'
            )
            return redirect('inventory:invoice_list')
            
        except ServiceException as e:
            messages.error(request, str(e))
    
    return render(request, 'inventory/invoice/invoice_confirm_cancel.html', {
        'invoice': invoice
    })


# ============================================================================
# KEY BENEFITS OF THIS APPROACH
# ============================================================================

"""
1. TESTABILITY
   - Services can be tested independently without HTTP requests
   - Mock dependencies easily
   - Unit tests run faster

2. REUSABILITY
   - Same service methods used in:
     * Web views
     * REST API endpoints
     * Management commands
     * Celery background tasks
     * Admin actions

3. MAINTAINABILITY
   - Business logic in one place
   - Easy to find and modify
   - Clear separation of concerns

4. PERFORMANCE
   - Bulk operations optimized in services
   - Transaction management centralized
   - Easy to add caching

5. SECURITY
   - Validation in one place
   - Consistent permission checks
   - Audit logging centralized
"""

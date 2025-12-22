from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q, Sum, F
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime
import sys

from ..models import Receipt, ReceiptItem, Supplier, PointOfSale, Product, StockMovement
from ..forms import ReceiptForm, ReceiptItemForm
from ..permissions import staff_required, superuser_required

@staff_required
def receipt_list(request):
    """Liste des bons de réception"""
    query = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    receipts = Receipt.objects.select_related('supplier', 'created_by').all().order_by('-date_received', '-created_at')
    
    if query:
        receipts = receipts.filter(
            Q(receipt_number__icontains=query) | 
            Q(supplier__name__icontains=query) |
            Q(supplier_reference__icontains=query)
        )
    
    if status_filter:
        receipts = receipts.filter(status=status_filter)

    if start_date:
        receipts = receipts.filter(date_received__gte=start_date)
    if end_date:
        receipts = receipts.filter(date_received__lte=end_date)
    
    paginator = Paginator(receipts, 10)
    page = request.GET.get('page')
    receipts = paginator.get_page(page)
    
    return render(request, 'inventory/receipt/receipt_list.html', {
        'receipts': receipts,
        'query': query,
        'status_filter': status_filter,
        'start_date': start_date,
        'end_date': end_date,
    })

@superuser_required
def receipt_create(request):
    """Créer un bon de réception"""
    if request.method == 'POST':
        form = ReceiptForm(request.POST)
        if form.is_valid():
            receipt = form.save(commit=False)
            receipt.created_by = request.user
            
            # Auto-assigner le point de vente depuis le profil utilisateur si non défini
            if not receipt.point_of_sale and hasattr(request.user, 'profile') and request.user.profile.point_of_sale:
                receipt.point_of_sale = request.user.profile.point_of_sale
            
            if not receipt.receipt_number:
                receipt.receipt_number = receipt.generate_receipt_number()
            receipt.save()
            messages.success(request, 'Bon de réception créé avec succès!')
            return redirect('inventory:receipt_detail', pk=receipt.pk)
    else:
        # Préremplir le point de vente depuis le profil utilisateur
        initial_data = {}
        if hasattr(request.user, 'profile') and request.user.profile.point_of_sale:
            initial_data['point_of_sale'] = request.user.profile.point_of_sale
        form = ReceiptForm(initial=initial_data)
    
    return render(request, 'inventory/receipt/receipt_form.html', {'form': form})

@staff_required
def receipt_detail(request, pk):
    """Détails d'un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    
    # Handle Add Item Form
    if request.method == 'POST':
        form = ReceiptItemForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.receipt = receipt
            item.save()
            receipt.calculate_total()
            messages.success(request, 'Article ajouté avec succès!')
            return redirect('inventory:receipt_detail', pk=pk)
        else:
            messages.error(request, 'Erreur lors de l\'ajout de l\'article. Veuillez vérifier le formulaire.')
    else:
        form = ReceiptItemForm()

    items = receipt.receiptitem_set.select_related('product').all()

    return render(request, 'inventory/receipt/receipt_detail.html', {
        'receipt': receipt,
        'items': items,
        'form': form
    })

@superuser_required
def receipt_update(request, pk):
    """Modifier un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    old_status = receipt.status
    
    if request.method == 'POST':
        form = ReceiptForm(request.POST, instance=receipt)
        if form.is_valid():
            receipt = form.save()
            
            # Ajouter le stock si le statut change à 'received' ou 'validated' et que le stock n'a pas encore été ajouté
            if receipt.status in ['received', 'validated'] and old_status not in ['received', 'validated'] and not receipt.stock_added:
                try:
                    receipt.add_stock()
                    messages.success(request, 'Bon de réception modifié et stock ajouté automatiquement!')
                except ValueError as e:
                    messages.warning(request, f'Bon de réception modifié mais le stock n\'a pas pu être ajouté: {str(e)}')
            
            # Annuler l'ajout de stock si le statut change à 'draft' et que le stock a été ajouté
            elif receipt.status == 'draft' and receipt.stock_added:
                try:
                    receipt.revert_stock()
                    messages.success(request, 'Bon de réception remis en brouillon et stock annulé automatiquement!')
                except ValueError as e:
                    messages.warning(request, f'Bon de réception remis en brouillon mais le stock n\'a pas pu être annulé: {str(e)}')
            else:
                messages.success(request, 'Bon de réception modifié avec succès!')
            
            return redirect('inventory:receipt_detail', pk=pk)
    else:
        form = ReceiptForm(instance=receipt)
    
    return render(request, 'inventory/receipt/receipt_form.html', {
        'form': form,
        'receipt': receipt
    })

@superuser_required
def receipt_delete(request, pk):
    """Supprimer un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    
    if request.method == 'POST':
        # Si le stock a été ajouté, essayer de l'annuler d'abord
        if receipt.stock_added:
            try:
                receipt.revert_stock()
            except Exception as e:
                messages.error(request, f"Impossible de supprimer: Erreur lors de l'annulation du stock ({str(e)})")
                return redirect('inventory:receipt_detail', pk=pk)
                
        receipt.delete()
        messages.success(request, 'Bon de réception supprimé avec succès!')
        return redirect('inventory:receipt_list')
    
    return render(request, 'inventory/receipt/receipt_confirm_delete.html', {
        'receipt': receipt
    })

@superuser_required
def receipt_add_item(request, pk):
    """Ajouter un article à un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    
    if request.method == 'POST':
        form = ReceiptItemForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.receipt = receipt
            item.save()
            receipt.calculate_total()
            
            messages.success(request, 'Article ajouté avec succès!')
            return redirect('inventory:receipt_detail', pk=pk)
    else:
        form = ReceiptItemForm()
    
    return render(request, 'inventory/receipt/receipt_add_item.html', {
        'form': form,
        'receipt': receipt
    })

@superuser_required
def receipt_delete_item(request, pk, item_pk):
    """Supprimer un article d'un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    item = get_object_or_404(ReceiptItem, pk=item_pk, receipt=receipt)
    
    if request.method == 'POST':
        item.delete()
        receipt.calculate_total()
        messages.success(request, 'Article supprimé avec succès!')
        
    return redirect('inventory:receipt_detail', pk=pk)

@login_required
def receipt_change_status(request, pk, status):
    """Changer le statut d'un bon de réception"""
    receipt = get_object_or_404(Receipt, pk=pk)
    
    if status not in dict(Receipt.STATUS_CHOICES):
        messages.error(request, "Statut invalide.")
        return redirect('inventory:receipt_list')
        
    receipt.status = status
    receipt.save()
    messages.success(request, f"Statut du bon {receipt.receipt_number} mis à jour : {receipt.get_status_display()}")
    
    return redirect('inventory:receipt_list')

@login_required
def receipt_validate(request, pk):
    """Valider un bon de réception (POST uniquement)"""
    if request.method != 'POST':
        return redirect('inventory:receipt_detail', pk=pk)
        
    receipt = get_object_or_404(Receipt, pk=pk)
    
    if receipt.status != 'draft':
        messages.warning(request, "Ce bon de réception ne peut plus être validé.")
        return redirect('inventory:receipt_detail', pk=pk)
    
    try:
        with transaction.atomic():
            # 1. Changer le statut
            receipt.status = 'validated'
            # 2. Ajouter le stock
            receipt.add_stock()
        
        messages.success(request, f"✅ Bon de réception {receipt.receipt_number} validé et stock mis à jour avec succès.")
    except Exception as e:
        messages.error(request, f"❌ Erreur lors de la validation : {str(e)}")
    
    return redirect('inventory:receipt_detail', pk=pk)

@staff_required
def export_receipt_list_excel(request):
    """Exporter la liste des bons de réception en Excel"""
    from ..excel_utils import export_to_excel
    
    # Récupérer les filtres
    query = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    specific_date = request.GET.get('date')

    if specific_date:
        start_date = specific_date
        end_date = specific_date
    
    receipts = Receipt.objects.select_related('supplier', 'created_by').all().order_by('-date_received', '-created_at')
    
    if query:
        receipts = receipts.filter(
            Q(receipt_number__icontains=query) | 
            Q(supplier__name__icontains=query) |
            Q(supplier_reference__icontains=query)
        )
    
    if status_filter:
        receipts = receipts.filter(status=status_filter)

    if start_date:
        receipts = receipts.filter(date_received__gte=start_date)
    if end_date:
        receipts = receipts.filter(date_received__lte=end_date)
        
    headers = ['Numéro', 'Fournisseur', 'Référence Fournisseur', 'Date', 'Statut', 'Total', 'Créé par']
    data = []
    
    for receipt in receipts:
        data.append([
            receipt.receipt_number,
            receipt.supplier.name if receipt.supplier else '-',
            receipt.supplier_reference or '-',
            receipt.date_received.strftime('%d/%m/%Y') if receipt.date_received else '-',
            receipt.get_status_display(),
            float(receipt.total_amount),
            receipt.created_by.username if receipt.created_by else ''
        ])
        
    return export_to_excel(headers, data, "Bons de Réception", "Liste_Receptions")

@staff_required
def export_receipt_list_pdf(request):
    """Exporter la liste des bons de réception en PDF"""
    # Hack: Bypass broken lxml
    lxml_backup = sys.modules.get('lxml')
    sys.modules['lxml'] = None
    
    try:
        from django.template.loader import get_template
        from xhtml2pdf import pisa
        from ..models import CompanySettings
        
        # Récupérer les filtres
        query = request.GET.get('q', '')
        status_filter = request.GET.get('status', '')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        specific_date = request.GET.get('date')

        if specific_date:
            start_date = specific_date
            end_date = specific_date
        
        receipts = Receipt.objects.select_related('supplier', 'created_by').all().order_by('-date_received', '-created_at')
        
        if query:
            receipts = receipts.filter(
                Q(receipt_number__icontains=query) | 
                Q(supplier__name__icontains=query) |
                Q(supplier_reference__icontains=query)
            )
        
        if status_filter:
            receipts = receipts.filter(status=status_filter)

        if start_date:
            receipts = receipts.filter(date_received__gte=start_date)
        if end_date:
            receipts = receipts.filter(date_received__lte=end_date)
            
        # Calculer le total
        total_amount_sum = receipts.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        company_settings = CompanySettings.objects.first()
        
        context = {
            'receipts': receipts,
            'company_settings': company_settings,
            'generated_at': datetime.now(),
            'report_title': 'Liste des Bons de Réception',
            'query': query,
            'status_filter': status_filter,
            'start_date': start_date,
            'end_date': end_date,
            'total_amount_sum': total_amount_sum,
        }
        
        template = get_template('inventory/reports_pdf/receipt_list_pdf.html')
        html = template.render(context)
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Liste_Receptions_{datetime.now().strftime("%Y%m%d_%H%M")}.pdf"'
        pisa.CreatePDF(html, dest=response)
        return response
    finally:
        if lxml_backup:
            sys.modules['lxml'] = lxml_backup
        else:
            if 'lxml' in sys.modules:
                del sys.modules['lxml']

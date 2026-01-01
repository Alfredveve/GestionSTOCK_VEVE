from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.db import transaction, models
from django.utils import timezone
from decimal import Decimal
import json

from ..models import Product, Client, Invoice, InvoiceItem, PointOfSale, StockMovement, Category
from ..forms import ClientForm
from ..permissions import staff_required

@staff_required
def quick_sale(request):
    """Interface de vente rapide (POS)"""
    # Récupérer les données pour l'interface
    categories = Category.objects.all()
    clients = Client.objects.all().order_by('name')
    
    # Point de vente par défaut (celui de l'utilisateur ou le premier actif)
    pos = None
    if hasattr(request.user, 'profile') and request.user.profile.point_of_sale:
        pos = request.user.profile.point_of_sale
    else:
        pos = PointOfSale.objects.filter(is_active=True).first()

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            client_id = data.get('client_id')
            invoice_type = data.get('invoice_type', 'retail')
            apply_tax = data.get('apply_tax', True)
            discount = Decimal(str(data.get('discount', 0)))
            items = data.get('items', [])
            
            if not items:
                return JsonResponse({'success': False, 'message': 'Le panier est vide.'})
            
            with transaction.atomic():
                client = get_object_or_404(Client, id=client_id)
                
                # Créer la facture
                invoice = Invoice.objects.create(
                    client=client,
                    invoice_type=invoice_type,
                    point_of_sale=pos,
                    apply_tax=apply_tax,
                    date_issued=timezone.now().date(),
                    date_due=timezone.now().date(),
                    status='paid', # Vente rapide est généralement payée immédiatement
                    discount_amount=discount,
                    created_by=request.user
                )
                invoice.invoice_number = invoice.generate_invoice_number()
                invoice.save()
                
                # Créer les items et les mouvements de stock
                for item_data in items:
                    product = get_object_or_404(Product, id=item_data['product_id'])
                    qty = int(item_data['quantity'])
                    is_wholesale = item_data.get('is_wholesale', False)
                    
                    price = product.wholesale_selling_price if is_wholesale else product.selling_price
                    
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        quantity=qty,
                        unit_price=price,
                        is_wholesale=is_wholesale,
                        total=price * qty
                    )
                
                # Calculer les totaux
                invoice.calculate_totals()
                
                # Note: deduct_stock() est déjà appelé par update_status() ou manuellement
                invoice.deduct_stock()
                
            return JsonResponse({
                'success': True, 
                'message': 'Vente enregistrée avec succès!',
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'redirect_url': reverse('inventory:invoice_detail', args=[invoice.id])
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)})

    return render(request, 'inventory/pos/quick_sale.html', {
        'categories': categories,
        'clients': clients,
        'default_pos': pos,
    })

@staff_required
def api_search_products(request):
    """API de recherche rapide de produits pour le POS (SANS CACHE et par Dépôt)"""
    query = request.GET.get('q', '').strip()
    category_id = request.GET.get('category', '').strip()
    
    # Récupérer le point de vente actuel de l'utilisateur
    user_pos = None
    if hasattr(request.user, 'profile') and request.user.profile.point_of_sale:
        user_pos = request.user.profile.point_of_sale
    
    # Optimiser la requête avec select_related
    products = Product.objects.select_related('category')
    
    if query:
        products = products.filter(
            models.Q(name__icontains=query) | 
            models.Q(sku__icontains=query)
        )
    
    if category_id:
        products = products.filter(category_id=category_id)
    
    products = products.order_by(
        models.Case(
            models.When(sku__iexact=query, then=0),
            models.When(name__istartswith=query, then=1),
            default=2
        ),
        'name'
    )[:15]
    
    data = []
    for p in products:
        # Calculer le stock pour le point de vente spécifique de l'utilisateur
        if user_pos:
            local_inventory = p.inventory_set.filter(point_of_sale=user_pos).first()
            current_stock = local_inventory.quantity if local_inventory else 0
        else:
            # Fallback sur le stock total si aucun POS n'est assigné
            current_stock = p.inventory_set.aggregate(
                total=models.Sum('quantity')
            )['total'] or 0
        
        data.append({
            'id': p.id,
            'name': p.name,
            'sku': p.sku,
            'price': float(p.selling_price),
            'wholesale_price': float(p.wholesale_selling_price),
            'units_per_box': p.units_per_box,
            'stock': current_stock,
            'image_url': p.image.url if p.image else None,
        })
    
    return JsonResponse({'results': data})

@staff_required
def api_create_client(request):
    """API de création rapide de client"""
    if request.method == 'POST':
        name = request.POST.get('name')
        client_type = request.POST.get('client_type', 'individual')
        phone = request.POST.get('phone', '')
        
        if not name:
            return JsonResponse({'success': False, 'message': 'Le nom est requis.'})
            
        client = Client.objects.create(
            name=name,
            client_type=client_type,
            phone=phone
        )
        
        return JsonResponse({
            'success': True, 
            'id': client.id, 
            'name': client.name
        })
    return JsonResponse({'success': False, 'message': 'Méthode non autorisée.'})

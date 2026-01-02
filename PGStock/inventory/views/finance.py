from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime

from ..models import Expense, ExpenseCategory, PointOfSale, MonthlyProfitReport
from ..forms import ExpenseForm, ExpenseCategoryForm
from ..services import FinanceService

@login_required
def expense_list(request):
    """Affiche la liste des dépenses"""
    expenses = Expense.objects.all().order_by('-date')
    return render(request, 'inventory/finance/expense_list.html', {
        'expenses': expenses
    })

@login_required
@permission_required('inventory.add_expense', raise_exception=True)
def expense_add(request):
    """Ajouter une nouvelle dépense"""
    if request.method == 'POST':
        form = ExpenseForm(request.POST)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.created_by = request.user
            expense.save()
            messages.success(request, "Dépense enregistrée avec succès.")
            return redirect('inventory:expense_list')
    else:
        form = ExpenseForm(initial={'date': timezone.now().date()})
    
    return render(request, 'inventory/finance/expense_form.html', {
        'form': form,
        'title': 'Nouvelle Dépense'
    })

@login_required
def profit_report(request):
    """Affiche le rapport de profit mensuel"""
    today = timezone.now().date()
    month = int(request.GET.get('month', today.month))
    year = int(request.GET.get('year', today.year))
    
    # Mettre à jour les rapports pour le mois demandé
    FinanceService.update_all_reports_for_month(month, year)
    
    reports = MonthlyProfitReport.objects.filter(month=month, year=year)
    
    # Totaux globaux
    global_sales = reports.aggregate(t=Sum('total_sales_brut'))['t'] or 0
    global_profit = reports.aggregate(t=Sum('net_interest'))['t'] or 0
    
    # Données pour le graphique (Jan-Déc)
    monthly_data = MonthlyProfitReport.objects.filter(year=year).values('month').annotate(
        total_gross=Sum('gross_profit'),
        total_net=Sum('net_interest')
    ).order_by('month')
    
    # Initialiser les listes avec 0 pour les 12 mois
    chart_gross_profits = [0] * 12
    chart_net_interests = [0] * 12
    
    # Remplir avec les données existantes
    for data in monthly_data:
        month_index = data['month'] - 1  # 0-based index
        if 0 <= month_index < 12:
            chart_gross_profits[month_index] = float(data['total_gross'] or 0)
            chart_net_interests[month_index] = float(data['total_net'] or 0)

    # Mois en français
    months_choices = [
        (1, 'Janvier'), (2, 'Février'), (3, 'Mars'), (4, 'Avril'),
        (5, 'Mai'), (6, 'Juin'), (7, 'Juillet'), (8, 'Août'),
        (9, 'Septembre'), (10, 'Octobre'), (11, 'Novembre'), (12, 'Décembre')
    ]
    
    return render(request, 'inventory/finance/profit_report.html', {
        'reports': reports,
        'month': month,
        'year': year,
        'global_sales': global_sales,
        'global_profit': global_profit,
        'months': months_choices,
        'years': range(today.year - 2, today.year + 1),
        'chart_gross_profits': chart_gross_profits,
        'chart_net_interests': chart_net_interests,
    })


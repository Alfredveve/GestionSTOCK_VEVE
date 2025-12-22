from django.urls import path
from . import views

app_name = 'stock'

urlpatterns = [
    path('movements/', views.StockMovementListView.as_view(), name='movement_list'),
    path('movements/create/', views.StockMovementCreateView.as_view(), name='movement_create'),
    path('movements/<int:pk>/', views.StockMovementDetailView.as_view(), name='movement_detail'),
]

from django.urls import path
from . import views

app_name = 'purchasing'

urlpatterns = [
    path('receipts/', views.ReceiptListView.as_view(), name='receipt_list'),
    path('receipts/create/', views.ReceiptCreateView.as_view(), name='receipt_create'),
    path('receipts/<int:pk>/', views.ReceiptDetailView.as_view(), name='receipt_detail'),
]

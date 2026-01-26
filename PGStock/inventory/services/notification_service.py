"""
Notification Service

Centralizes all notification creation and management:
- Notification creation for various events
- Bulk notification creation for staff
- Notification status management
"""

from typing import List, Optional
from django.contrib.auth.models import User
from django.db import transaction

from .base import BaseService


class NotificationService(BaseService):
    """
    Service for managing notifications.
    
    Centralizes notification logic to avoid duplication in signals.
    """
    
    @transaction.atomic
    def create_notification(
        self,
        recipient: User,
        title: str,
        message: str,
        notification_type: str = 'info',
        link: str = "",
        is_read: bool = False
    ):
        """
        Create a notification for a user.
        
        Args:
            recipient: User to notify
            title: Notification title
            message: Notification message
            notification_type: Type ('info', 'success', 'warning', 'error')
            link: Optional link to related resource
            is_read: Whether notification is already read
            
        Returns:
            Created Notification instance
        """
        from inventory.models import Notification
        
        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link,
            is_read=is_read
        )
        
        self.log_info(
            f"Notification created for {recipient.username}",
            notification_id=notification.id,
            type=notification_type
        )
        
        return notification
    
    def bulk_create_for_staff(
        self,
        title: str,
        message: str,
        notification_type: str = 'info',
        link: str = ""
    ) -> List:
        """
        Create notifications for all staff users.
        
        Args:
            title: Notification title
            message: Notification message
            notification_type: Type ('info', 'success', 'warning', 'error')
            link: Optional link to related resource
            
        Returns:
            List of created Notification instances
        """
        from inventory.models import Notification
        
        staff_users = User.objects.filter(is_staff=True)
        notifications = []
        
        for user in staff_users:
            notification = Notification.objects.create(
                recipient=user,
                title=title,
                message=message,
                notification_type=notification_type,
                link=link,
                is_read=False
            )
            notifications.append(notification)
        
        self.log_info(
            f"Created {len(notifications)} notifications for staff",
            type=notification_type
        )
        
        return notifications
    
    def notify_low_stock(self, product, inventory):
        """
        Create low stock notification.
        
        Args:
            product: Product with low stock
            inventory: Inventory instance
        """
        return self.bulk_create_for_staff(
            title="Stock Faible",
            message=f"Le produit '{product.name}' est en stock faible ({inventory.quantity} unités restantes).",
            notification_type='warning',
            link="/stock-movements"
        )
    
    def notify_invoice_created(self, invoice):
        """
        Create notification for new invoice.
        
        Args:
            invoice: Created invoice
        """
        # Only notify if not already paid (POS case)
        if invoice.status != 'paid':
            return self.bulk_create_for_staff(
                title="Nouvelle Facture",
                message=f"Facture {invoice.invoice_number} créée pour {invoice.client.name} - Montant: {invoice.total_amount} GNF",
                notification_type='info',
                link=f"/invoices/{invoice.id}"
            )
        return []
    
    def notify_payment_received(self, payment):
        """
        Create notification for payment received.
        
        Args:
            payment: Payment instance
        """
        invoice = payment.invoice
        return self.bulk_create_for_staff(
            title="Paiement Reçu",
            message=f"Paiement de {payment.amount} GNF reçu pour la facture {invoice.invoice_number}",
            notification_type='success',
            link=f"/invoices/{invoice.id}"
        )
    
    def notify_order_created(self, order):
        """
        Create notification for new order.
        
        Args:
            order: Created order
        """
        return self.bulk_create_for_staff(
            title="Nouvelle Commande",
            message=f"Commande {order.order_number} créée pour {order.client.name} - Montant: {order.total_amount} GNF",
            notification_type='info',
            link=f"/quotes"
        )
    
    def notify_order_status_changed(self, order, old_status: str, new_status: str):
        """
        Create notification for order status change.
        
        Args:
            order: Order instance
            old_status: Previous status
            new_status: New status
        """
        status_labels = {
            'pending': 'En attente',
            'validated': 'Validée',
            'processing': 'En préparation',
            'shipped': 'Expédiée',
            'delivered': 'Livrée',
            'cancelled': 'Annulée'
        }
        
        return self.bulk_create_for_staff(
            title="Changement de Statut Commande",
            message=f"Commande {order.order_number} : {status_labels.get(old_status, old_status)} → {status_labels.get(new_status, new_status)}",
            notification_type='info' if new_status != 'cancelled' else 'warning',
            link=f"/quotes"
        )
    
    def notify_receipt_validated(self, receipt):
        """
        Create notification for receipt validation.
        
        Args:
            receipt: Receipt instance
        """
        return self.bulk_create_for_staff(
            title="Bon de Réception Validé",
            message=f"Bon de réception {receipt.receipt_number} validé - Fournisseur: {receipt.supplier.name}",
            notification_type='success',
            link=f"/purchases"
        )
    
    def notify_transfer_completed(self, stock_movement):
        """
        Create notification for completed transfer.
        
        Args:
            stock_movement: StockMovement instance
        """
        return self.bulk_create_for_staff(
            title="Transfert Complété",
            message=f"Transfert de {stock_movement.quantity} {stock_movement.product.name} de {stock_movement.from_point_of_sale.name} vers {stock_movement.to_point_of_sale.name}",
            notification_type='success',
            link="/stock-movements"
        )
    
    def notify_product_price_changed(self, product, old_price, new_price, price_type: str):
        """
        Create notification for product price change.
        
        Args:
            product: Product instance
            old_price: Old price
            new_price: New price
            price_type: Type of price changed ('retail' or 'wholesale')
        """
        price_label = "détail" if price_type == 'retail' else "gros"
        
        return self.bulk_create_for_staff(
            title="Changement de Prix",
            message=f"Prix de {price_label} de '{product.name}' modifié : {old_price} GNF → {new_price} GNF",
            notification_type='info',
            link=f"/products"
        )
    
    def mark_as_read(self, notification):
        """
        Mark a notification as read.
        
        Args:
            notification: Notification to mark as read
        """
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        
        return notification
    
    def mark_all_as_read(self, user: User):
        """
        Mark all notifications as read for a user.
        
        Args:
            user: User whose notifications to mark as read
            
        Returns:
            Number of notifications marked as read
        """
        from inventory.models import Notification
        
        count = Notification.objects.filter(
            recipient=user,
            is_read=False
        ).update(is_read=True)
        
        self.log_info(
            f"Marked {count} notifications as read for {user.username}",
            user_id=user.id
        )
        
        return count
    
    def get_unread_count(self, user: User) -> int:
        """
        Get count of unread notifications for a user.
        
        Args:
            user: User to check
            
        Returns:
            Number of unread notifications
        """
        from inventory.models import Notification
        
        return Notification.objects.filter(
            recipient=user,
            is_read=False
        ).count()
    
    def delete_old_notifications(self, days: int = 90):
        """
        Delete notifications older than specified days.
        
        Args:
            days: Number of days to keep notifications
            
        Returns:
            Number of notifications deleted
        """
        from inventory.models import Notification
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        count = Notification.objects.filter(
            created_at__lt=cutoff_date,
            is_read=True
        ).delete()[0]
        
        self.log_info(f"Deleted {count} old notifications")
        
        return count

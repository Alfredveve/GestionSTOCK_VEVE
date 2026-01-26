from django.contrib import admin
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.utils.html import format_html

@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ['action_time', 'user', 'content_type', 'object_repr', 'action_badge']
    list_filter = ['action_flag', 'content_type', 'action_time']
    search_fields = ['object_repr', 'change_message', 'user__username']
    readonly_fields = [
        'action_time', 'user', 'content_type', 'object_id', 
        'object_repr', 'action_flag', 'change_message'
    ]

    def action_badge(self, obj):
        colors = {
            ADDITION: 'success',
            CHANGE: 'warning',
            DELETION: 'danger',
        }
        labels = {
            ADDITION: 'Ajout',
            CHANGE: 'Modification',
            DELETION: 'Suppression',
        }
        
        badge_class = colors.get(obj.action_flag, 'secondary')
        label = labels.get(obj.action_flag, 'Inconnu')
        
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            badge_class,
            label
        )
    action_badge.short_description = "Action"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

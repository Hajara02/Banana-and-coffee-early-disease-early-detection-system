from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'crop_type', 'predicted_disease', 'severity', 'status', 'created_at')
    list_filter = ('crop_type', 'status', 'severity')
    search_fields = ('user__username', 'predicted_disease', 'symptoms')

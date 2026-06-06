from django.db import models
from django.contrib.auth.models import User


class Report(models.Model):
    CROP_CHOICES = (
        ('banana', 'Banana'),
        ('coffee', 'Coffee'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending Review'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    farmer_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=200, blank=True)
    crop_type = models.CharField(max_length=20, choices=CROP_CHOICES)
    symptoms = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    image = models.ImageField(upload_to='reports/', null=True, blank=True)
    predicted_disease = models.CharField(max_length=200, blank=True)
    severity = models.CharField(max_length=50, blank=True)
    advisory = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.id} - {self.crop_type} - {self.predicted_disease or 'Unknown'}"

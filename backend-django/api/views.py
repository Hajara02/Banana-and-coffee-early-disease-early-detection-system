import os
import importlib.util
from django.conf import settings
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User

from .models import Report
from .serializers import UserSerializer, ReportSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


def _analyze_with_ml(report_obj):
    """Attempt to use an existing ML model from backend-python; fall back to rule-based analysis."""
    try:
        model_path = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'backend-python', 'ml_model', 'model.py'))
        if os.path.exists(model_path):
            spec = importlib.util.spec_from_file_location('ml_model', model_path)
            ml = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(ml)
            image_path = report_obj.image.path if report_obj.image else None
            result = ml.predict(image_path, report_obj.symptoms)
            return result
    except Exception:
        pass

    symptoms = (report_obj.symptoms or '').lower()
    if 'bacterial' in symptoms or 'wilt' in symptoms:
        return {
            'disease': 'Banana Bacterial Wilt',
            'severity': 'High',
            'advisory': 'Isolate affected plants, remove infected material, sterilize tools, apply appropriate bactericides, and monitor closely.'
        }
    if 'rust' in symptoms or 'spots' in symptoms:
        return {
            'disease': 'Coffee Leaf Rust',
            'severity': 'Medium',
            'advisory': 'Prune infected leaves, improve spacing for airflow, apply recommended fungicides, and use resistant varieties where possible.'
        }
    return {
        'disease': 'Unknown',
        'severity': 'Low',
        'advisory': 'No clear signs detected; collect more data and images for model-based analysis.'
    }


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Report.objects.all().order_by('-created_at')
        return Report.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        report = serializer.save(user=self.request.user)
        result = _analyze_with_ml(report)
        report.predicted_disease = result.get('disease', '')
        report.severity = result.get('severity', '')
        report.advisory = result.get('advisory', '')
        report.save()


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Report.objects.all()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def analytics_overview(request):
    user = request.user
    if user.is_staff:
        reports = Report.objects.all()
    else:
        reports = Report.objects.filter(user=user)

    total = reports.count()
    critical = reports.filter(severity__iexact='high').count()
    pending = reports.filter(status='pending').count()
    resolved = reports.filter(status='resolved').count()
    recent = ReportSerializer(reports.order_by('-created_at')[:5], many=True).data

    return Response({
        'total_reports': total,
        'high_critical': critical,
        'pending_reviews': pending,
        'resolved_cases': resolved,
        'recent_reports': recent,
    })
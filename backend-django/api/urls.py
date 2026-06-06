from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('auth/signup/', views.RegisterView.as_view(), name='signup'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('reports/', views.ReportListCreateView.as_view(), name='reports'),
    path('reports/<int:pk>/', views.ReportDetailView.as_view(), name='report-detail'),
    path('analytics/overview/', views.analytics_overview, name='analytics-overview'),
]

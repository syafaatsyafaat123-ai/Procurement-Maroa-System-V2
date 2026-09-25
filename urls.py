from django.urls import path
from .views import GlobalSearchView, LifecycleTimelineView

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('lifecycle/', LifecycleTimelineView.as_view(), name='lifecycle-timeline'),
]

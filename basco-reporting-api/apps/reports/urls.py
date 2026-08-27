"""
apps/reports/urls.py
---------------------
URL patterns for the reports app.

Mounted at /api/reports/ in config/urls.py, so the full paths are:
  GET /api/reports/league-table/
  GET /api/reports/market-maturity/
  GET /api/reports/visual-adoption/
  GET /api/reports/cta-mix/
"""

from django.urls import path

from .views import CtaMixView, LeagueTableView, MarketMaturityView, VisualAdoptionView
from .evidence_views import EvidenceLockerView
from .visual_adoption_views import VisualAdoptionView as VisualAdoptionV2View
from .product_mix_views import ProductMixView
from .cta_campaign_views import CTACampaignView
from .offer_cta_views import OfferCTAView

app_name = "reports"

urlpatterns = [
    path("league-table/",    LeagueTableView.as_view(),    name="league-table"),
    path("market-maturity/", MarketMaturityView.as_view(), name="market-maturity"),
    path("visual-adoption/", VisualAdoptionView.as_view(), name="visual-adoption"),
    path("cta-mix/",         CtaMixView.as_view(),         name="cta-mix"),
    path("evidence-locker/", EvidenceLockerView.as_view(), name="evidence-locker"),
    path("visual-adoption-v2/", VisualAdoptionV2View.as_view(), name="visual-adoption-v2"),
    path("api/reports/visual-adoption-v2/", VisualAdoptionV2View.as_view(), name="visual-adoption-v2-full"),
    path("product-mix/",     ProductMixView.as_view(),     name="product-mix"),
    path("api/reports/product-mix/", ProductMixView.as_view(), name="product-mix-full"),
    path("cta-campaign/",    CTACampaignView.as_view(),    name="cta-campaign"),
    path("api/reports/cta-campaign/", CTACampaignView.as_view(), name="cta-campaign-full"),
    path("offer-cta/",       OfferCTAView.as_view(),       name="offer-cta"),
    path("api/reports/offer-cta/",    OfferCTAView.as_view(),       name="offer-cta-full"),
]





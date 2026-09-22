"""URL patterns for the reports app, mounted at /api/reports/."""

from django.urls import path

from .views import LeagueTableView, MarketMaturityView
from .overview_views import OverviewView
from .evidence_views import EvidenceLockerView
from .visual_adoption_views import VisualAdoptionView
from .product_mix_views import ProductMixView
from .cta_campaign_views import CTACampaignView
from .offer_cta_views import OfferCTAView

app_name = "reports"

urlpatterns = [
    path("overview/",        OverviewView.as_view(),       name="overview"),
    path("league-table/",    LeagueTableView.as_view(),    name="league-table"),
    path("market-maturity/", MarketMaturityView.as_view(), name="market-maturity"),
    path("visual-adoption/", VisualAdoptionView.as_view(), name="visual-adoption"),
    path("evidence-locker/", EvidenceLockerView.as_view(), name="evidence-locker"),
    path("product-mix/",     ProductMixView.as_view(),     name="product-mix"),
    path("cta-campaign/",    CTACampaignView.as_view(),    name="cta-campaign"),
    path("offer-cta/",       OfferCTAView.as_view(),       name="offer-cta"),
]

